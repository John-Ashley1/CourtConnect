package com.courtconnect;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification,Long> {
  List<Notification> findTop100ByUserOrderBySentAtDesc(User user);
  long countByUserAndReadAtIsNull(User user);
  Optional<Notification> findByIdAndUser(Long id, User user);
  @Modifying @Query("update Notification n set n.readAt = :now where n.user = :user and n.readAt is null")
  int markAllRead(User user, Instant now);
}
