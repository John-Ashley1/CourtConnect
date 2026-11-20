package com.courtconnect;
import jakarta.persistence.*;
import java.time.Instant;

/**
 * One "forgot password" link. Only the SHA-256 hash of the token is stored, so a leaked
 * database can't be used to reset anyone's password. Usable once, until expiresAt.
 */
@Entity @Table(name="password_reset_token")
public class PasswordResetToken {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="user_id", nullable=false) private User user;
  @Column(name="token_hash", nullable=false, unique=true, length=64) private String tokenHash;
  @Column(name="expires_at", nullable=false) private Instant expiresAt;
  @Column(name="used_at") private Instant usedAt;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();

  protected PasswordResetToken(){}
  public PasswordResetToken(User user, String tokenHash, Instant expiresAt){ this.user=user; this.tokenHash=tokenHash; this.expiresAt=expiresAt; }

  public User getUser(){ return user; }
  public Instant getCreatedAt(){ return createdAt; }
  public boolean isUsable(Instant now){ return usedAt == null && now.isBefore(expiresAt); }
}
