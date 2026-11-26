package com.courtconnect;
import jakarta.persistence.*;
import java.time.Instant;

/** In-app notification (booking made, cancelled, expired, paid). Push delivery (Firebase) comes in a later increment. */
@Entity @Table(name="notification", indexes=@Index(name="idx_notification_user", columnList="user_id,sent_at"))
public class Notification {
  public enum Type { BOOKING, GAME, REMINDER, PAYMENT, CANCELLED, CHANGE }

  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="user_id", nullable=false) private User user;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=12) private Type type;
  @Column(nullable=false, length=500) private String message;
  @Column(name="sent_at", nullable=false, updatable=false) private Instant sentAt = Instant.now();
  @Column(name="read_at") private Instant readAt;

  protected Notification(){}
  public Notification(User user, Type type, String message){ this.user=user; this.type=type; this.message=message; }

  public Long getId(){ return id; }
  public User getUser(){ return user; }
  public Type getType(){ return type; }
  public String getMessage(){ return message; }
  public Instant getSentAt(){ return sentAt; }
  public boolean isRead(){ return readAt != null; }
  public void markRead(Instant at){ if (readAt == null) readAt = at; }
}
