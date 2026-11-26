package com.courtconnect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment,Long> {
  Optional<Payment> findFirstByBookingOrderByIdDesc(Booking booking);
  Optional<Payment> findByPaymongoReference(String reference);
  /** Every payment of these bookings, newest first, so the first one per booking is its current payment. */
  @Query("select p from Payment p where p.booking in :bookings order by p.id desc")
  List<Payment> findForBookings(Collection<Booking> bookings);
}
