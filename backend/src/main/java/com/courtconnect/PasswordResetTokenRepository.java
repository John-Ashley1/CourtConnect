package com.courtconnect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken,Long> {
  Optional<PasswordResetToken> findByTokenHash(String tokenHash);
  Optional<PasswordResetToken> findFirstByUserOrderByCreatedAtDesc(User user);

  /** Marks every unused link of this user as used, so only the newest one (or none) works. */
  @Modifying @Query("update PasswordResetToken t set t.usedAt = :now where t.user = :user and t.usedAt is null")
  int expireAllFor(User user, Instant now);
}
