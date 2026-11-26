package com.courtconnect;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface TimeSlotRepository extends JpaRepository<TimeSlot,Long> {
  List<TimeSlot> findByCourtAndSlotDateOrderByStartTimeAsc(Court court, LocalDate date);
  List<TimeSlot> findByCourtInAndSlotDateOrderByStartTimeAsc(Collection<Court> courts, LocalDate date);
  List<TimeSlot> findByBooking(Booking booking);
  boolean existsByCourtAndSlotDate(Court court, LocalDate date);

  /** Row locks (SELECT … FOR UPDATE): two players booking the same slot at once are handled one after the other (FR-016). */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TimeSlot s where s.id in :ids order by s.slotDate, s.startTime")
  List<TimeSlot> lockAll(Collection<Long> ids);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TimeSlot s where s.booking = :booking")
  List<TimeSlot> lockByBooking(Booking booking);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TimeSlot s where s.court = :court and s.slotDate = :date and s.startTime >= :start and s.startTime < :end order by s.startTime")
  List<TimeSlot> lockRange(Court court, LocalDate date, LocalTime start, LocalTime end);

  @Query("select s.court.id, count(s) from TimeSlot s where s.court in :courts and s.slotDate = :date and s.status = :status and s.startTime > :after group by s.court.id")
  List<Object[]> countByStatus(Collection<Court> courts, LocalDate date, LocalTime after, TimeSlot.Status status);

  /** Unused future slots, deleted before slots are generated again from new hours. */
  @Modifying @Query("delete from TimeSlot s where s.court = :court and s.status = :status and s.booking is null and (s.slotDate > :today or (s.slotDate = :today and s.startTime > :now))")
  int deleteFuture(Court court, LocalDate today, LocalTime now, TimeSlot.Status status);
}
