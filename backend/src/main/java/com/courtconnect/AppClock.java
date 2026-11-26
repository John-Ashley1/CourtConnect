package com.courtconnect;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.*;

/**
 * "Now" in the facilities' local time (Asia/Manila by default), so slot dates and times mean the same
 * thing to the server as to the players, whatever time zone the server itself runs in.
 */
@Component
public class AppClock {
  private final ZoneId zone;
  public AppClock(@Value("${app.timezone:Asia/Manila}") String zone){ this.zone = ZoneId.of(zone); }

  public ZoneId zone(){ return zone; }
  public Instant now(){ return Instant.now(); }
  public LocalDate today(){ return LocalDate.now(zone); }
  public LocalTime timeNow(){ return LocalTime.now(zone).withNano(0); }
  public LocalDateTime localNow(){ return LocalDateTime.now(zone); }

  /** True once the slot/booking starting at date + time has begun. */
  public boolean hasStarted(LocalDate date, LocalTime start){ return !LocalDateTime.of(date, start).isAfter(localNow()); }
  /** True once the period ending at date + end is over. */
  public boolean hasEnded(LocalDate date, LocalTime end){ return !LocalDateTime.of(date, end).isAfter(localNow()); }
}
