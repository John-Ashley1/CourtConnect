package com.courtconnect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * FR-019: releases unpaid holds. Runs every 15 seconds, and is also called right before slots are read or
 * booked, so a slot whose hold just ran out is shown and bookable as Available straight away.
 * Each booking expires in its own transaction, so one failure doesn't stop the others.
 */
@Component
public class BookingExpiry {
  private static final Logger log = LoggerFactory.getLogger(BookingExpiry.class);
  private final BookingRepository bookings; private final BookingService service; private final AppClock clock;
  public BookingExpiry(BookingRepository bookings, BookingService service, AppClock clock){
    this.bookings = bookings; this.service = service; this.clock = clock; }

  @Scheduled(fixedDelayString="${app.bookings.expiry-check-ms:15000}", initialDelay=5000)
  public void run(){
    for (Long id : bookings.findIdsDueBefore(Booking.Status.PENDING, clock.now())) {
      try { if (service.expireIfOverdue(id)) log.info("Booking {} expired (not paid in time); its slots were released.", id); }
      catch (RuntimeException e) { log.warn("Could not expire booking {}: {}", id, e.getMessage()); }
    }
  }
}
