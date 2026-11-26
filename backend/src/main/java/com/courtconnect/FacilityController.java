package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

/** Facilities (FR-007, FR-010), their courts (FR-008) and the facility schedule (FR-014). */
@RestController @RequestMapping("/api/facilities")
public class FacilityController {
  private final FacilityService facilities; private final CourtService courts; private final ScheduleService schedule; private final BookingExpiry expiry;
  public FacilityController(FacilityService facilities, CourtService courts, ScheduleService schedule, BookingExpiry expiry){
    this.facilities = facilities; this.courts = courts; this.schedule = schedule; this.expiry = expiry; }

  @GetMapping
  public List<FacilityDto> all(){ return facilities.listAll(); }

  @GetMapping("/mine") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public List<FacilityDto> mine(@AuthenticationPrincipal User me){ return facilities.listMine(me); }

  @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public FacilityDto create(@AuthenticationPrincipal User me, @Valid @RequestBody FacilityRequest r){ return facilities.create(me, r); }

  @PutMapping("/{facilityId}") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public FacilityDto update(@AuthenticationPrincipal User me, @PathVariable Long facilityId, @Valid @RequestBody FacilityRequest r){
    return facilities.update(me, facilityId, r); }

  @GetMapping("/{facilityId}/courts")
  public List<CourtDto> courts(@PathVariable Long facilityId){ return courts.listByFacility(facilityId); }

  @PostMapping("/{facilityId}/courts") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public CourtDto addCourt(@AuthenticationPrincipal User me, @PathVariable Long facilityId, @Valid @RequestBody CourtRequest r){
    return courts.create(me, facilityId, r); }

  @GetMapping("/{facilityId}/schedule") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public List<ScheduleCourtDto> schedule(@AuthenticationPrincipal User me, @PathVariable Long facilityId,
                                         @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){
    expiry.run();
    return schedule.schedule(me, facilityId, date);
  }
}
