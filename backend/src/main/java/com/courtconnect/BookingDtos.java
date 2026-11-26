package com.courtconnect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Increment 3 request/response bodies. JSON uses snake_case (court_name, slot_id …) to match the ERD
 * and the React pages; @JsonNaming does the conversion. Dates are 'YYYY-MM-DD', times 'HH:mm:ss'.
 */
public final class BookingDtos {
  private BookingDtos(){}
  static final DateTimeFormatter HMS = DateTimeFormatter.ofPattern("HH:mm:ss");
  static String hms(LocalTime t){ return t == null ? null : t.format(HMS); }

  // ---------- requests ----------

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record FacilityRequest(
    @NotBlank(message="Enter the facility name.") @Size(max=100, message="Use 100 characters or fewer.") String name,
    @NotBlank(message="Enter a contact number like 0917 123 4567.") @Size(max=20, message="Enter a contact number like 0917 123 4567.") String phone,
    @NotBlank(message="Enter the street address.") @Size(max=150, message="Use 150 characters or fewer.") String address,
    @NotBlank(message="Enter the city or municipality.") @Size(max=100, message="Use 100 characters or fewer.") String city) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record CourtRequest(
    @NotBlank(message="Enter a court name.") @Size(max=60, message="Use 60 characters or fewer.") String courtName,
    @NotBlank(message="Choose a sport.") String sportType,
    Boolean isIndoor,
    @NotNull(message="Enter a rate greater than ₱0.") @DecimalMin(value="1", message="Enter a rate of at least ₱1.")
    @DecimalMax(value="100000", message="Enter a rate of ₱100,000 or less.") @Digits(integer=6, fraction=2, message="Use at most 2 decimal places.") BigDecimal rentalRate,
    @Size(max=500, message="Use a shorter link (500 characters or fewer).") String photoUrl) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record DayHours(
    @NotNull(message="Each day needs a day_of_week from 0 (Sunday) to 6 (Saturday).") @Min(value=0, message="day_of_week must be 0 (Sunday) to 6 (Saturday).")
    @Max(value=6, message="day_of_week must be 0 (Sunday) to 6 (Saturday).") Integer dayOfWeek,
    boolean isOpen,
    @NotBlank(message="Enter an opening time for every day.") String openTime,
    @NotBlank(message="Enter a closing time for every day.") String closeTime) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record HoursRequest(@NotNull(message="Choose a slot length.") Integer slotMinutes,
    @NotNull(message="Enter 5 to 60 minutes.") Integer paymentHoldMinutes,
    @NotNull @Size(min=7, max=7, message="Send the hours for all 7 days.") List<@Valid DayHours> operatingHours) {}

  public record BlockRequest(String reason) {}

  /** camelCase on purpose: bookingService.holdSlots sends { courtId, slotIds }. */
  public record HoldRequest(@NotNull(message="Choose a court.") Long courtId,
    @NotEmpty(message="Pick at least one time slot.") List<@NotNull Long> slotIds) {}

  // ---------- responses ----------

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class) @JsonInclude(JsonInclude.Include.NON_NULL)
  public record FacilityDto(Long facilityId, String name, String phone, String address, String city,
                            double latitude, double longitude, Integer courtCount) {
    public static FacilityDto of(Facility f, Integer courtCount){
      return new FacilityDto(f.getId(), f.getName(), f.getPhone(), f.getAddress(), f.getCity(), f.getLatitude(), f.getLongitude(), courtCount); }
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record DayHoursDto(int dayOfWeek, boolean isOpen, String openTime, String closeTime) {
    public static DayHoursDto of(CourtHours h){ return new DayHoursDto(h.getDayOfWeek(), h.isOpen(), hms(h.getOpenTime()), hms(h.getCloseTime())); }
  }

  /** open_time / close_time: earliest opening and latest closing over the week (null when closed every day). */
  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class) @JsonInclude(JsonInclude.Include.NON_NULL)
  public record CourtDto(Long courtId, Long facilityId, String courtName, String sportType, boolean isIndoor, BigDecimal rentalRate,
                         int slotMinutes, int paymentHoldMinutes, String photoUrl, String openTime, String closeTime,
                         List<DayHoursDto> operatingHours, FacilityDto facility, Double distanceKm, Integer openSlots) {
    public static CourtDto of(Court c, List<CourtHours> hours, Double distanceKm, Integer openSlots){
      List<CourtHours> open = hours.stream().filter(CourtHours::isOpen).toList();
      LocalTime from = open.stream().map(CourtHours::getOpenTime).min(LocalTime::compareTo).orElse(null);
      LocalTime to = open.stream().map(CourtHours::getCloseTime).max(LocalTime::compareTo).orElse(null);
      return new CourtDto(c.getId(), c.getFacility().getId(), c.getCourtName(), c.getSportType(), c.isIndoor(), c.getRentalRate(),
        c.getSlotMinutes(), c.getPaymentHoldMinutes(), c.getPhotoUrl(), hms(from), hms(to),
        hours.stream().map(DayHoursDto::of).toList(), FacilityDto.of(c.getFacility(), null), distanceKm, openSlots);
    }
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record PersonDto(Long userId, String fullName, String email, String phoneNo) {
    public static PersonDto of(User u){ return u == null ? null : new PersonDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhoneNo()); }
  }

  /** The booking holding a slot, for the facility schedule. */
  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record SlotBookingDto(Long bookingId, String qrCode, Booking.Status status, PersonDto player) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record SlotDto(Long slotId, Long courtId, String slotDate, String startTime, String endTime,
                        TimeSlot.Status status, String blockReason, SlotBookingDto booking) {
    /** Players never see who booked a slot. */
    public static SlotDto forPlayer(TimeSlot s){ return new SlotDto(s.getId(), s.getCourt().getId(), s.getSlotDate().toString(),
      hms(s.getStartTime()), hms(s.getEndTime()), s.getStatus(), null, null); }
    public static SlotDto forFacility(TimeSlot s){
      Booking b = s.getBooking();
      return new SlotDto(s.getId(), s.getCourt().getId(), s.getSlotDate().toString(), hms(s.getStartTime()), hms(s.getEndTime()),
        s.getStatus(), s.getBlockReason(), b == null ? null : new SlotBookingDto(b.getId(), b.getQrCode(), b.getStatus(), PersonDto.of(b.getPlayer())));
    }
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record ScheduleCourtDto(Long courtId, String courtName, String sportType, boolean isIndoor, int slotMinutes, List<SlotDto> slots) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record BookingSlotDto(String slotDate, String startTime, String endTime) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record BookingCourtDto(Long courtId, String courtName, String sportType, boolean isIndoor, BigDecimal rentalRate, int slotMinutes) {}

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record PaymentDto(String method, BigDecimal amount, String status, String paymongoReference, Instant paidAt) {}

  /**
   * slot = the first slot (start of the booking); end_time = when the whole booking ends (multi-hour bookings).
   * payment is null until the player starts paying.
   */
  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record BookingDto(Long bookingId, String qrCode, Booking.Status status, BigDecimal totalFee, BigDecimal hours,
                           Instant paymentDeadline, Instant createdAt, Instant cancelledAt, String cancelledBy,
                           BookingSlotDto slot, String endTime, BookingCourtDto court, FacilityDto facility, PersonDto player, PaymentDto payment) {
    public static BookingDto of(Booking b, PaymentDto payment){
      Court c = b.getCourt();
      LocalTime firstEnd = b.getStartTime().plusMinutes(c.getSlotMinutes());
      if (firstEnd.isAfter(b.getEndTime()) || firstEnd.isBefore(b.getStartTime())) firstEnd = b.getEndTime();
      return new BookingDto(b.getId(), b.getQrCode(), b.getStatus(), b.getTotalFee(), b.getHours().stripTrailingZeros(),
        b.getPaymentDeadline(), b.getCreatedAt(), b.getCancelledAt(), b.getCancelledBy(),
        new BookingSlotDto(b.getSlotDate().toString(), hms(b.getStartTime()), hms(firstEnd)), hms(b.getEndTime()),
        new BookingCourtDto(c.getId(), c.getCourtName(), c.getSportType(), c.isIndoor(), c.getRentalRate(), c.getSlotMinutes()),
        FacilityDto.of(c.getFacility(), null), PersonDto.of(b.getPlayer()), payment);
    }
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record NotificationDto(Long notificationId, Notification.Type type, String message, Instant sentAt, boolean isRead) {
    public static NotificationDto of(Notification n){ return new NotificationDto(n.getId(), n.getType(), n.getMessage(), n.getSentAt(), n.isRead()); }
  }

  public record CountDto(long count) {}
}
