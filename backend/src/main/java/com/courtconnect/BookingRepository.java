package com.courtconnect;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking,Long> {
  boolean existsByQrCode(String qrCode);

  /** Row lock on the booking: status changes (pay, cancel, expire) on the same booking run one at a time. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b where b.id = :id")
  Optional<Booking> lockById(Long id);
  Optional<Booking> findByQrCode(String qrCode);

  @Query("select b from Booking b join fetch b.court c join fetch c.facility where b.player = :player order by b.slotDate, b.startTime")
  List<Booking> findByPlayer(User player);

  @Query("select b from Booking b join fetch b.court c join fetch c.facility f join fetch b.player where f.admin = :admin order by b.slotDate, b.startTime")
  List<Booking> findByFacilityAdmin(User admin);

  @Query("select b.id from Booking b where b.status = :status and b.paymentDeadline < :now")
  List<Long> findIdsDueBefore(Booking.Status status, Instant now);

  long countByPlayerAndStatus(User player, Booking.Status status);

  @Query("select count(b) from Booking b where b.court = :court and b.status in :statuses and (b.slotDate > :today or (b.slotDate = :today and b.endTime > :now))")
  long countUpcoming(Court court, LocalDate today, LocalTime now, Collection<Booking.Status> statuses);
}
