package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Facility schedule: every court's slots for a day with who holds them (FR-014), and blocking slots (FR-020). */
@Service
public class ScheduleService {
  public static final List<String> BLOCK_REASONS = List.of("Maintenance", "Private event");
  private final FacilityService facilities; private final CourtRepository courts; private final TimeSlotRepository slots; private final AppClock clock;
  public ScheduleService(FacilityService facilities, CourtRepository courts, TimeSlotRepository slots, AppClock clock){
    this.facilities = facilities; this.courts = courts; this.slots = slots; this.clock = clock; }

  @Transactional(readOnly=true)
  public List<ScheduleCourtDto> schedule(User admin, Long facilityId, LocalDate date){
    Facility f = facilities.owned(admin, facilityId);
    List<Court> list = courts.findActiveByFacility(f.getId());
    if (list.isEmpty()) return List.of();
    Map<Long,List<TimeSlot>> byCourt = slots.findByCourtInAndSlotDateOrderByStartTimeAsc(list, date == null ? clock.today() : date)
      .stream().collect(Collectors.groupingBy(s -> s.getCourt().getId()));
    return list.stream().map(c -> new ScheduleCourtDto(c.getId(), c.getCourtName(), c.getSportType(), c.isIndoor(), c.getSlotMinutes(),
      byCourt.getOrDefault(c.getId(), List.of()).stream().map(SlotDto::forFacility).toList())).toList();
  }

  @Transactional
  public SlotDto block(User admin, Long slotId, String reason){
    TimeSlot s = lockOwned(admin, slotId);
    String why = BLOCK_REASONS.stream().filter(r -> r.equalsIgnoreCase(reason == null ? "" : reason.trim())).findFirst()
      .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "reason", "Choose Maintenance or Private event."));
    if (s.getStatus() != TimeSlot.Status.AVAILABLE)
      throw new ApiException(HttpStatus.CONFLICT, "Only Available slots can be blocked. This slot is now " + s.getStatus().name().toLowerCase() + ".");
    if (clock.hasStarted(s.getSlotDate(), s.getStartTime())) throw new ApiException(HttpStatus.CONFLICT, "This slot has already started, so it can't be blocked.");
    s.block(why);
    return SlotDto.forFacility(s);
  }

  @Transactional
  public SlotDto unblock(User admin, Long slotId){
    TimeSlot s = lockOwned(admin, slotId);
    if (s.getStatus() != TimeSlot.Status.BLOCKED) throw new ApiException(HttpStatus.CONFLICT, "This slot isn't blocked.");
    s.release();
    return SlotDto.forFacility(s);
  }

  private TimeSlot lockOwned(User admin, Long slotId){
    return slots.lockAll(List.of(slotId)).stream()
      .filter(s -> !s.getCourt().isRemoved() && s.getCourt().getFacility().getAdmin().getId().equals(admin.getId()))
      .findFirst().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found."));
  }
}
