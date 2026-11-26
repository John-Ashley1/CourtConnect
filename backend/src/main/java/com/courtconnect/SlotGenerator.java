package com.courtconnect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

/**
 * Generates time slots from each court's weekly hours and slot length (FR-013), for today and the
 * next `app.slots.days-ahead` days. Slots per day = (closing − opening) ÷ slot length, rounded down.
 *
 * When hours change, unused future Available slots are deleted and generated again. Pending, Booked and
 * Blocked slots are never touched; new slots that would overlap them are skipped.
 * Every night (and at startup) the window is topped up so a new day always has slots.
 */
@Component
public class SlotGenerator {
  private static final Logger log = LoggerFactory.getLogger(SlotGenerator.class);
  private final TimeSlotRepository slots; private final CourtRepository courts; private final CourtHoursRepository hours;
  private final AppClock clock; private final TransactionTemplate tx; private final int daysAhead;

  public SlotGenerator(TimeSlotRepository slots, CourtRepository courts, CourtHoursRepository hours, AppClock clock,
                       PlatformTransactionManager txm, @Value("${app.slots.days-ahead:14}") int daysAhead){
    this.slots = slots; this.courts = courts; this.hours = hours; this.clock = clock;
    this.tx = new TransactionTemplate(txm); this.daysAhead = daysAhead;
  }

  public int daysAhead(){ return daysAhead; }

  /** Replaces the court's unused future slots with slots from its current hours. Runs in the caller's transaction. */
  @Transactional
  public int regenerate(Court court){
    LocalDate today = clock.today();
    slots.deleteFuture(court, today, clock.timeNow(), TimeSlot.Status.AVAILABLE);
    slots.flush();
    Map<Integer,CourtHours> week = byDay(hours.findByCourtOrderByDayOfWeekAsc(court));
    int made = 0;
    for (int i = 0; i < daysAhead; i++) made += generateDay(court, today.plusDays(i), week);
    return made;
  }

  /** Fills days in the window that have no slots yet (e.g. the day that just entered the window). */
  @Scheduled(cron="${app.slots.top-up-cron:0 5 0 * * *}", zone="${app.timezone:Asia/Manila}")
  @EventListener(ApplicationReadyEvent.class)
  public void topUp(){
    int made = 0;
    for (Court c : courts.findAllActive()) {
      try {
        Integer n = tx.execute(s -> {
          Court court = courts.findById(c.getId()).orElseThrow();
          Map<Integer,CourtHours> week = byDay(hours.findByCourtOrderByDayOfWeekAsc(court));
          int k = 0;
          for (int i = 0; i < daysAhead; i++) {
            LocalDate d = clock.today().plusDays(i);
            if (!slots.existsByCourtAndSlotDate(court, d)) k += generateDay(court, d, week);
          }
          return k;
        });
        made += n == null ? 0 : n;
      } catch (RuntimeException e) {   // e.g. the court's hours were being saved at the same moment
        log.warn("Slot top-up skipped court {}: {}", c.getId(), e.getMessage());
      }
    }
    if (made > 0) log.info("Generated {} new time slots.", made);
  }

  private int generateDay(Court court, LocalDate date, Map<Integer,CourtHours> week){
    CourtHours h = week.get(date.getDayOfWeek().getValue() % 7);   // java: Mon=1 … Sun=7 → ours: Sun=0 … Sat=6
    if (h == null || !h.isOpen()) return 0;
    List<TimeSlot> existing = slots.findByCourtAndSlotDateOrderByStartTimeAsc(court, date);
    boolean today = date.equals(clock.today());
    LocalTime now = clock.timeNow();
    List<TimeSlot> fresh = new ArrayList<>();
    int len = court.getSlotMinutes();
    for (int m = minutes(h.getOpenTime()); m + len <= minutes(h.getCloseTime()); m += len) {
      LocalTime start = LocalTime.of(m / 60, m % 60), end = start.plusMinutes(len);
      int endMin = m + len;   // compared as minutes so 23:00 + 60 (= 00:00) still counts as after 23:00
      if (today && !start.isAfter(now)) continue;   // already started
      int sm = m;
      boolean overlaps = existing.stream().anyMatch(s -> sm < minutes(s.getEndTime(), s.getStartTime()) && minutes(s.getStartTime()) < endMin);
      if (!overlaps) fresh.add(new TimeSlot(court, date, start, end));
    }
    slots.saveAll(fresh);
    return fresh.size();
  }

  private static Map<Integer,CourtHours> byDay(List<CourtHours> list){
    Map<Integer,CourtHours> m = new HashMap<>();
    list.forEach(h -> m.put(h.getDayOfWeek(), h));
    return m;
  }
  private static int minutes(LocalTime t){ return t.getHour() * 60 + t.getMinute(); }
  /** End time in minutes; an end of 00:00 after a later start means midnight (24:00). */
  private static int minutes(LocalTime end, LocalTime start){ int e = minutes(end); return e <= minutes(start) ? e + 24 * 60 : e; }
}
