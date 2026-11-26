package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Predicate;

/**
 * Booking rules:
 *  FR-015  a player books 1–4 consecutive Available slots of one court on one date
 *  FR-016  no double booking: the slots are row-locked, re-checked and taken in one transaction
 *  FR-017  the slots become Pending while the player pays; FR-019 unpaid holds expire (see BookingExpiry)
 *  FR-021  fee = court rate × hours, fixed when booking
 *  FR-052  booking history · FR-053 player cancels · FR-054 cancelled slots are released
 *  FR-018 / FR-059 / FR-060  facility administrators see and cancel bookings at their own facilities
 * Status changes on an existing booking always lock the booking row first, then its slots.
 */
@Service
public class BookingService {
  public static final int MAX_SLOTS = 4;
  public static final int MAX_UNPAID = 3;
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final String REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O, 1/I/L
  private static final DateTimeFormatter WHEN_DAY = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.ENGLISH);
  private static final DateTimeFormatter WHEN_TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

  private final BookingRepository bookings; private final TimeSlotRepository slots; private final PaymentRepository payments;
  private final CourtService courts; private final NotificationService notifications; private final AppClock clock;

  public BookingService(BookingRepository bookings, TimeSlotRepository slots, PaymentRepository payments,
                        CourtService courts, NotificationService notifications, AppClock clock){
    this.bookings = bookings; this.slots = slots; this.payments = payments;
    this.courts = courts; this.notifications = notifications; this.clock = clock;
  }

  // ---------- player ----------

  @Transactional
  public BookingDto hold(User player, HoldRequest r){
    List<Long> ids = r.slotIds().stream().distinct().toList();
    if (ids.size() > MAX_SLOTS) throw new ApiException(HttpStatus.BAD_REQUEST, "You can book up to " + MAX_SLOTS + " slots at a time.");
    Court court = courts.active(r.courtId());
    if (bookings.countByPlayerAndStatus(player, Booking.Status.PENDING) >= MAX_UNPAID)
      throw new ApiException(HttpStatus.BAD_REQUEST, "You have " + MAX_UNPAID + " unpaid bookings. Pay for or cancel one before booking another.");

    List<TimeSlot> picked = slots.lockAll(ids);   // SELECT … FOR UPDATE, in date/time order
    if (picked.size() != ids.size() || picked.stream().anyMatch(s -> !s.getCourt().getId().equals(court.getId())))
      throw new ApiException(HttpStatus.CONFLICT, "Those time slots are no longer offered. Pick again from the updated times.");
    for (int i = 1; i < picked.size(); i++) {
      TimeSlot a = picked.get(i - 1), b = picked.get(i);
      if (!a.getSlotDate().equals(b.getSlotDate()) || !a.getEndTime().equals(b.getStartTime()))
        throw new ApiException(HttpStatus.BAD_REQUEST, "Pick time slots that are next to each other on the same day.");
    }
    TimeSlot first = picked.get(0), last = picked.get(picked.size() - 1);
    if (clock.hasStarted(first.getSlotDate(), first.getStartTime()))
      throw new ApiException(HttpStatus.CONFLICT, "That time has already started. Pick a later slot.");
    Optional<TimeSlot> taken = picked.stream().filter(s -> s.getStatus() != TimeSlot.Status.AVAILABLE).findFirst();
    if (taken.isPresent())
      throw new ApiException(HttpStatus.CONFLICT, "Sorry, the " + taken.get().getStartTime().format(WHEN_TIME)
        + " slot was just taken or isn't available. Pick another time.");

    BigDecimal hours = BigDecimal.valueOf((long) picked.size() * court.getSlotMinutes()).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    Booking b = new Booking();
    b.setPlayer(player); b.setCourt(court); b.setStatus(Booking.Status.PENDING);
    b.setSlotDate(first.getSlotDate()); b.setStartTime(first.getStartTime()); b.setEndTime(last.getEndTime());
    b.setHours(hours);
    b.setTotalFee(court.getRentalRate().multiply(hours).setScale(2, RoundingMode.HALF_UP));
    b.setPaymentDeadline(clock.now().plusSeconds(court.getPaymentHoldMinutes() * 60L));
    b.setQrCode(newReference());
    bookings.save(b);
    picked.forEach(s -> s.hold(b));
    return dto(b);
  }

  @Transactional(readOnly=true)
  public BookingDto getMine(User player, Long id){ return dto(mine(player, id)); }

  @Transactional(readOnly=true)
  public List<BookingDto> listMine(User player){ return dtos(bookings.findByPlayer(player)); }

  @Transactional
  public BookingDto cancelMine(User player, Long id){
    Booking b = lock(id, x -> x.getPlayer().getId().equals(player.getId()));
    cancel(b, "PLAYER");
    notifications.send(b.getCourt().getFacility().getAdmin(), Notification.Type.CANCELLED,
      player.getFullName() + " cancelled booking " + b.getQrCode() + " (" + b.getCourt().getCourtName() + ", " + when(b) + "). The slot is available again.");
    return dto(b);
  }

  // ---------- facility administrator ----------

  /**
   * Booking records at the administrator's facilities (FR-059), filtered by text (reference or player name),
   * status, facility and period: upcoming | today | week (last 7 days) | month (last 30 days) | all.
   */
  @Transactional(readOnly=true)
  public List<BookingDto> listForFacility(User admin, String q, String status, Long facilityId, String period){
    Booking.Status st = null;
    if (status != null && !status.isBlank()) {
      try { st = Booking.Status.valueOf(status.trim().toUpperCase()); }
      catch (IllegalArgumentException e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown booking status: " + status); }
    }
    String text = q == null ? "" : q.trim().toLowerCase();
    LocalDate today = clock.today();
    String p = period == null || period.isBlank() ? "upcoming" : period;
    Predicate<Booking> inPeriod = switch (p) {
      case "upcoming" -> b -> !clock.hasEnded(b.getSlotDate(), b.getEndTime());
      case "today" -> b -> b.getSlotDate().equals(today);
      case "week" -> b -> !b.getSlotDate().isBefore(today.minusDays(6)) && !b.getSlotDate().isAfter(today);
      case "month" -> b -> !b.getSlotDate().isBefore(today.minusDays(29)) && !b.getSlotDate().isAfter(today);
      case "all" -> b -> true;
      default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown period: " + period);
    };
    Booking.Status fst = st;
    List<Booking> list = new ArrayList<>(bookings.findByFacilityAdmin(admin).stream()
      .filter(b -> fst == null || b.getStatus() == fst)
      .filter(b -> facilityId == null || b.getCourt().getFacility().getId().equals(facilityId))
      .filter(b -> text.isEmpty() || b.getQrCode().toLowerCase().contains(text) || b.getPlayer().getFullName().toLowerCase().contains(text))
      .filter(inPeriod).toList());
    if (!p.equals("upcoming") && !p.equals("today")) Collections.reverse(list);   // past periods: newest first
    return dtos(list);
  }

  /**
   * FR-018: the facility administrator confirms a Pending booking (payment arranged with the facility while
   * online payment isn't available). Its slots become Booked. Only before the hold runs out and before it ends.
   */
  @Transactional
  public BookingDto confirmForFacility(User admin, Long id){
    Booking b = lock(id, x -> x.getCourt().getFacility().getAdmin().getId().equals(admin.getId()));
    if (b.getStatus() != Booking.Status.PENDING)
      throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " is " + b.getStatus().name().toLowerCase() + ", so it can't be confirmed.");
    if (!b.getPaymentDeadline().isAfter(clock.now()))
      throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " wasn't confirmed within the time limit and has expired. The slot is being released.");
    if (clock.hasEnded(b.getSlotDate(), b.getEndTime()))
      throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " is already over, so it can't be confirmed.");
    slots.lockByBooking(b).forEach(TimeSlot::book);
    b.setStatus(Booking.Status.CONFIRMED);
    notifications.send(b.getPlayer(), Notification.Type.BOOKING,
      b.getCourt().getFacility().getName() + " confirmed your booking " + b.getQrCode() + ": " + b.getCourt().getCourtName() + ", " + when(b)
      + ". Show its QR code when you arrive.");
    return dto(b);
  }

  @Transactional
  public BookingDto cancelForFacility(User admin, Long id){
    Booking b = lock(id, x -> x.getCourt().getFacility().getAdmin().getId().equals(admin.getId()));
    cancel(b, "FACILITY_ADMIN");
    notifications.send(b.getPlayer(), Notification.Type.CANCELLED,
      b.getCourt().getFacility().getName() + " cancelled your booking " + b.getQrCode() + " (" + b.getCourt().getCourtName() + ", " + when(b)
      + "). Contact the facility about any refund.");
    return dto(b);
  }

  // ---------- used by BookingExpiry and PaymentService ----------

  /** FR-019: a Pending booking past its payment deadline becomes Expired and its slots are released. */
  @Transactional
  public boolean expireIfOverdue(Long id){
    Booking b = bookings.lockById(id).orElse(null);
    if (b == null || b.getStatus() != Booking.Status.PENDING || b.getPaymentDeadline().isAfter(clock.now())) return false;
    b.setStatus(Booking.Status.EXPIRED);
    slots.lockByBooking(b).forEach(TimeSlot::release);
    notifications.send(b.getPlayer(), Notification.Type.PAYMENT,
      "Booking " + b.getQrCode() + " expired because it wasn't paid in time. The " + b.getCourt().getCourtName() + " slot on " + when(b) + " was released.");
    return true;
  }

  /**
   * Payment verified: Pending → Confirmed and the slots become Booked. Runs in the caller's transaction with the
   * booking already locked. If the hold had expired but every slot is still free, the slots are taken back.
   * Returns false when the slots were taken by someone else in the meantime (the payment must be refunded).
   */
  @Transactional
  public boolean confirmPaid(Booking b){
    if (b.getStatus() == Booking.Status.CONFIRMED) return true;
    List<TimeSlot> held;
    if (b.getStatus() == Booking.Status.PENDING) held = slots.lockByBooking(b);
    else if (b.getStatus() == Booking.Status.EXPIRED) {
      held = slots.lockRange(b.getCourt(), b.getSlotDate(), b.getStartTime(), b.getEndTime());
      if (held.isEmpty() || held.stream().anyMatch(s -> s.getStatus() != TimeSlot.Status.AVAILABLE)) return false;
    } else return false;   // cancelled
    held.forEach(s -> { s.hold(b); s.book(); });
    b.setStatus(Booking.Status.CONFIRMED);
    notifications.send(b.getPlayer(), Notification.Type.BOOKING,
      "Booking " + b.getQrCode() + " is confirmed: " + b.getCourt().getCourtName() + " at " + b.getCourt().getFacility().getName() + ", " + when(b) + ". Show its QR code when you arrive.");
    notifications.send(b.getCourt().getFacility().getAdmin(), Notification.Type.BOOKING,
      b.getPlayer().getFullName() + " booked " + b.getCourt().getCourtName() + " for " + when(b) + " (" + b.getQrCode() + ", paid).");
    return true;
  }

  /** The player's own booking, locked; 404 for anyone else's. */
  Booking lockMine(User player, Long id){ return lock(id, x -> x.getPlayer().getId().equals(player.getId())); }

  BookingDto dto(Booking b){
    return BookingDto.of(b, payments.findFirstByBookingOrderByIdDesc(b).map(BookingService::paymentDto).orElse(null));
  }

  // ---------- helpers ----------

  private void cancel(Booking b, String by){
    if (!b.isActive()) throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " is already " + b.getStatus().name().toLowerCase() + ".");
    if (clock.hasStarted(b.getSlotDate(), b.getStartTime()))
      throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " has already started, so it can't be cancelled.");
    b.cancel(by, clock.now());
    slots.lockByBooking(b).forEach(TimeSlot::release);   // FR-054: Available for others again
    payments.findFirstByBookingOrderByIdDesc(b).filter(p -> p.getStatus() == Payment.Status.PENDING).ifPresent(p -> p.setStatus(Payment.Status.FAILED));
  }

  private Booking mine(User player, Long id){
    return bookings.findById(id).filter(b -> b.getPlayer().getId().equals(player.getId()))
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found."));
  }

  private Booking lock(Long id, Predicate<Booking> allowed){
    return bookings.lockById(id).filter(allowed).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found."));
  }

  private List<BookingDto> dtos(List<Booking> list){
    if (list.isEmpty()) return List.of();
    Map<Long,PaymentDto> latest = new HashMap<>();
    payments.findForBookings(list).forEach(p -> latest.putIfAbsent(p.getBooking().getId(), paymentDto(p)));
    return list.stream().map(b -> BookingDto.of(b, latest.get(b.getId()))).toList();
  }

  static PaymentDto paymentDto(Payment p){
    return new PaymentDto(p.getMethod(), p.getAmount(), p.getStatus().name(), p.getPaymongoReference(), p.getPaidAt());
  }

  /** e.g. CC-2611-7KQ4M2: year+month, then 6 random characters (hard to guess, easy to read out). */
  private String newReference(){
    String prefix = "CC-" + clock.today().format(DateTimeFormatter.ofPattern("yyMM")) + "-";
    for (int attempt = 0; attempt < 20; attempt++) {
      StringBuilder s = new StringBuilder(prefix);
      for (int i = 0; i < 6; i++) s.append(REF_CHARS.charAt(RANDOM.nextInt(REF_CHARS.length())));
      if (!bookings.existsByQrCode(s.toString())) return s.toString();
    }
    throw new IllegalStateException("Could not create a unique booking reference.");
  }

  static String when(Booking b){
    return b.getSlotDate().format(WHEN_DAY) + ", " + b.getStartTime().format(WHEN_TIME) + "–" + b.getEndTime().format(WHEN_TIME);
  }
}
