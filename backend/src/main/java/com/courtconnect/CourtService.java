package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Courts (FR-008 add/edit, FR-009 remove), their hours and slot length (FR-011),
 * court details for players (FR-012) and the court search that leads players to them.
 */
@Service
public class CourtService {
  public static final List<String> SPORTS = List.of("Basketball", "Badminton", "Volleyball", "Pickleball", "Tennis");
  static final Set<Integer> SLOT_LENGTHS = Set.of(30, 60, 90, 120);
  static final LocalTime DEFAULT_OPEN = LocalTime.of(6, 0), DEFAULT_CLOSE = LocalTime.of(22, 0);

  private final CourtRepository courts; private final CourtHoursRepository hours; private final TimeSlotRepository slots;
  private final BookingRepository bookings; private final FacilityService facilities; private final SlotGenerator generator; private final AppClock clock;

  public CourtService(CourtRepository courts, CourtHoursRepository hours, TimeSlotRepository slots, BookingRepository bookings,
                      FacilityService facilities, SlotGenerator generator, AppClock clock){
    this.courts = courts; this.hours = hours; this.slots = slots; this.bookings = bookings;
    this.facilities = facilities; this.generator = generator; this.clock = clock;
  }

  // ---------- players ----------

  /** Bookable courts with distance from (lat, lng) and open slots on `date`. sort: "distance" (default) or "rate". */
  @Transactional(readOnly=true)
  public List<CourtDto> search(String sport, LocalDate date, Double maxKm, String sort, double lat, double lng){
    LocalDate day = date == null || date.isBefore(clock.today()) ? clock.today() : date;
    List<Court> list = courts.findAllActive().stream()
      .filter(c -> sport == null || sport.isBlank() || c.getSportType().equalsIgnoreCase(sport.trim())).toList();
    if (list.isEmpty()) return List.of();
    Map<Long,List<CourtHours>> week = hoursOf(list);
    LocalTime after = day.equals(clock.today()) ? clock.timeNow() : LocalTime.MIN;
    Map<Long,Integer> open = new HashMap<>();
    slots.countByStatus(list, day, after, TimeSlot.Status.AVAILABLE).forEach(r -> open.put((Long) r[0], ((Long) r[1]).intValue()));
    Comparator<CourtDto> byDistance = Comparator.comparing(CourtDto::distanceKm);
    Comparator<CourtDto> order = "rate".equalsIgnoreCase(sort) ? Comparator.comparing(CourtDto::rentalRate).thenComparing(byDistance) : byDistance.thenComparing(CourtDto::rentalRate);
    return list.stream()
      .map(c -> CourtDto.of(c, week.getOrDefault(c.getId(), List.of()), km(lat, lng, c.getFacility()), open.getOrDefault(c.getId(), 0)))
      .filter(c -> maxKm == null || maxKm <= 0 || c.distanceKm() <= maxKm)
      .sorted(order).toList();
  }

  @Transactional(readOnly=true)
  public CourtDto get(Long courtId){
    Court c = active(courtId);
    return CourtDto.of(c, hours.findByCourtOrderByDayOfWeekAsc(c), null, null);
  }

  @Transactional(readOnly=true)
  public List<CourtDto> listByFacility(Long facilityId){ return toDtos(courts.findActiveByFacility(facilityId)); }

  /** A court's slots on one date, in start-time order (FR-014). Players see status only. */
  @Transactional(readOnly=true)
  public List<SlotDto> slotsFor(Long courtId, LocalDate date){
    Court c = active(courtId);
    return slots.findByCourtAndSlotDateOrderByStartTimeAsc(c, date == null ? clock.today() : date).stream().map(SlotDto::forPlayer).toList();
  }

  // ---------- facility administrator ----------

  @Transactional(readOnly=true)
  public List<CourtDto> listMine(User admin){ return toDtos(courts.findActiveByAdmin(admin)); }

  @Transactional
  public CourtDto create(User admin, Long facilityId, CourtRequest r){
    Facility f = facilities.owned(admin, facilityId);
    Court c = new Court();
    c.setFacility(f);
    apply(c, r);
    courts.save(c);
    // Open every day 6:00 AM – 10:00 PM with 1-hour slots until the administrator changes it.
    List<CourtHours> week = new ArrayList<>();
    for (int d = 0; d < 7; d++) week.add(new CourtHours(c, d, true, DEFAULT_OPEN, DEFAULT_CLOSE));
    hours.saveAll(week);
    generator.regenerate(c);
    return CourtDto.of(c, week, null, null);
  }

  @Transactional
  public CourtDto update(User admin, Long courtId, CourtRequest r){
    Court c = owned(admin, courtId);
    apply(c, r);
    return CourtDto.of(c, hours.findByCourtOrderByDayOfWeekAsc(c), null, null);
  }

  /** Refused while the court has upcoming Pending/Confirmed bookings (FR-009). */
  @Transactional
  public void remove(User admin, Long courtId){
    Court c = owned(admin, courtId);
    long upcoming = bookings.countUpcoming(c, clock.today(), clock.timeNow(), List.of(Booking.Status.PENDING, Booking.Status.CONFIRMED));
    if (upcoming > 0) throw new ApiException(HttpStatus.CONFLICT, c.getCourtName() + " has " + upcoming + " upcoming "
      + (upcoming == 1 ? "booking" : "bookings") + ". Cancel " + (upcoming == 1 ? "it" : "them") + " in Booking records first.");
    c.setRemoved(true);
    slots.deleteFuture(c, clock.today(), clock.timeNow(), TimeSlot.Status.AVAILABLE);
    slots.deleteFuture(c, clock.today(), clock.timeNow(), TimeSlot.Status.BLOCKED);
  }

  /** Saves slot length, payment hold time and weekly hours, then regenerates future slots (FR-011, FR-013). */
  @Transactional
  public CourtDto saveHours(User admin, Long courtId, HoursRequest r){
    Court c = owned(admin, courtId);
    if (!SLOT_LENGTHS.contains(r.slotMinutes())) throw new ApiException(HttpStatus.BAD_REQUEST, "slot_minutes", "Choose a slot length of 30, 60, 90 or 120 minutes.");
    if (r.paymentHoldMinutes() < 5 || r.paymentHoldMinutes() > 60) throw new ApiException(HttpStatus.BAD_REQUEST, "lim", "Enter 5 to 60 minutes.");
    Map<Integer,DayHours> byDay = new HashMap<>();
    for (DayHours d : r.operatingHours()) {
      if (byDay.put(d.dayOfWeek(), d) != null) throw new ApiException(HttpStatus.BAD_REQUEST, "Each day can appear only once.");
    }
    if (byDay.size() != 7) throw new ApiException(HttpStatus.BAD_REQUEST, "Send the hours for all 7 days.");

    Map<Integer,CourtHours> existing = new HashMap<>();
    hours.findByCourtOrderByDayOfWeekAsc(c).forEach(h -> existing.put(h.getDayOfWeek(), h));
    for (DayHours d : byDay.values()) {
      LocalTime open = time(d.openTime()), close = time(d.closeTime());
      if (d.isOpen() && !close.isAfter(open)) throw new ApiException(HttpStatus.BAD_REQUEST, "Closing must be after opening (" + dayName(d.dayOfWeek()) + ").");
      CourtHours h = existing.get(d.dayOfWeek());
      if (h == null) hours.save(new CourtHours(c, d.dayOfWeek(), d.isOpen(), open, close));
      else { h.setOpen(d.isOpen()); h.setOpenTime(open); h.setCloseTime(close); }
    }
    c.setSlotMinutes(r.slotMinutes());
    c.setPaymentHoldMinutes(r.paymentHoldMinutes());
    hours.flush();
    generator.regenerate(c);
    return CourtDto.of(c, hours.findByCourtOrderByDayOfWeekAsc(c), null, null);
  }

  Court owned(User admin, Long courtId){
    return courts.findById(courtId).filter(c -> !c.isRemoved() && c.getFacility().getAdmin().getId().equals(admin.getId()))
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Court not found."));
  }

  Court active(Long courtId){
    return courts.findById(courtId).filter(c -> !c.isRemoved()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Court not found."));
  }

  private void apply(Court c, CourtRequest r){
    String sport = SPORTS.stream().filter(s -> s.equalsIgnoreCase(r.sportType().trim())).findFirst()
      .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "sport_type", "Choose a sport from the list."));
    String name = r.courtName().trim().replaceAll("\\s+", " ");
    boolean taken = courts.findActiveByFacility(c.getFacility().getId()).stream()
      .anyMatch(o -> !o.getId().equals(c.getId()) && o.getCourtName().equalsIgnoreCase(name));
    if (taken) throw new ApiException(HttpStatus.CONFLICT, "court_name", "This facility already has a court with that name.");
    String photo = r.photoUrl() == null || r.photoUrl().isBlank() ? null : r.photoUrl().trim();
    if (photo != null && !photo.matches("(?i)^https://\\S+$")) throw new ApiException(HttpStatus.BAD_REQUEST, "photo_url", "Enter an image link that starts with https://, or leave it blank.");
    c.setCourtName(name); c.setSportType(sport); c.setIndoor(r.isIndoor() == null || r.isIndoor());
    c.setRentalRate(r.rentalRate().setScale(2, RoundingMode.HALF_UP)); c.setPhotoUrl(photo);
  }

  private List<CourtDto> toDtos(List<Court> list){
    Map<Long,List<CourtHours>> week = hoursOf(list);
    return list.stream().map(c -> CourtDto.of(c, week.getOrDefault(c.getId(), List.of()), null, null)).toList();
  }

  private Map<Long,List<CourtHours>> hoursOf(List<Court> list){
    if (list.isEmpty()) return Map.of();
    return hours.findByCourtIn(list).stream()
      .sorted(Comparator.comparingInt(CourtHours::getDayOfWeek))
      .collect(Collectors.groupingBy(h -> h.getCourt().getId()));
  }

  /** Straight-line (haversine) distance in km, one decimal. Road distance comes with Google Maps directions later. */
  static double km(double lat, double lng, Facility f){
    double r = 6371, dLat = Math.toRadians(f.getLatitude() - lat), dLng = Math.toRadians(f.getLongitude() - lng);
    double a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(f.getLatitude())) * Math.pow(Math.sin(dLng / 2), 2);
    return BigDecimal.valueOf(2 * r * Math.asin(Math.sqrt(a))).setScale(1, RoundingMode.HALF_UP).doubleValue();
  }

  private static LocalTime time(String s){
    try { return LocalTime.parse(s.trim()).withSecond(0).withNano(0); }
    catch (DateTimeParseException e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Use times like 06:00:00."); }
  }
  private static String dayName(int d){ return List.of("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday").get(d); }
}
