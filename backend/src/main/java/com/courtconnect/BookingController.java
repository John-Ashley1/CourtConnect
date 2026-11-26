package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Bookings: players book, view and cancel their own (/api/bookings); facility administrators see and cancel
 * bookings at their facilities (/api/facility-bookings); facility administrators block slots (/api/slots).
 * Overdue holds are expired first, so every answer reflects FR-019.
 */
@RestController
public class BookingController {
  private final BookingService bookings; private final ScheduleService schedule; private final BookingExpiry expiry;
  public BookingController(BookingService bookings, ScheduleService schedule, BookingExpiry expiry){
    this.bookings = bookings; this.schedule = schedule; this.expiry = expiry; }

  // ---- player ----

  @GetMapping("/api/bookings/mine") @PreAuthorize("hasRole('PLAYER')")
  public List<BookingDto> mine(@AuthenticationPrincipal User me){ expiry.run(); return bookings.listMine(me); }

  @GetMapping("/api/bookings/{bookingId}") @PreAuthorize("hasRole('PLAYER')")
  public BookingDto get(@AuthenticationPrincipal User me, @PathVariable Long bookingId){ expiry.run(); return bookings.getMine(me, bookingId); }

  @PostMapping("/api/bookings") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasRole('PLAYER')")
  public BookingDto hold(@AuthenticationPrincipal User me, @Valid @RequestBody HoldRequest r){ expiry.run(); return bookings.hold(me, r); }

  @PostMapping("/api/bookings/{bookingId}/cancel") @PreAuthorize("hasRole('PLAYER')")
  public BookingDto cancel(@AuthenticationPrincipal User me, @PathVariable Long bookingId){ expiry.run(); return bookings.cancelMine(me, bookingId); }

  // ---- facility administrator ----

  @GetMapping("/api/facility-bookings") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public List<BookingDto> facilityBookings(@AuthenticationPrincipal User me, @RequestParam(required=false) String q,
      @RequestParam(required=false) String status, @RequestParam(required=false) Long facilityId,
      @RequestParam(defaultValue="upcoming") String period){
    expiry.run();
    return bookings.listForFacility(me, q, status, facilityId, period);
  }

  @PostMapping("/api/facility-bookings/{bookingId}/confirm") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public BookingDto facilityConfirm(@AuthenticationPrincipal User me, @PathVariable Long bookingId){ expiry.run(); return bookings.confirmForFacility(me, bookingId); }

  @PostMapping("/api/facility-bookings/{bookingId}/cancel") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public BookingDto facilityCancel(@AuthenticationPrincipal User me, @PathVariable Long bookingId){ expiry.run(); return bookings.cancelForFacility(me, bookingId); }

  @PostMapping("/api/slots/{slotId}/block") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public SlotDto block(@AuthenticationPrincipal User me, @PathVariable Long slotId, @RequestBody(required=false) BlockRequest r){
    return schedule.block(me, slotId, r == null ? null : r.reason()); }

  @PostMapping("/api/slots/{slotId}/unblock") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public SlotDto unblock(@AuthenticationPrincipal User me, @PathVariable Long slotId){ return schedule.unblock(me, slotId); }
}
