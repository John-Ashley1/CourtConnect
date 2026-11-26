package com.courtconnect;
import jakarta.persistence.*;
import java.time.Instant;

/**
 * FR-059: one row per booking status change — created (→ Pending), confirmed, cancelled, expired —
 * with who did it and when. Rows are only ever added, never changed, so this is the booking's audit trail.
 */
@Entity @Table(name="booking_event", indexes=@Index(name="idx_booking_event_booking", columnList="booking_id,created_at"))
public class BookingEvent {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="booking_id", nullable=false, updatable=false) private Booking booking;
  /** null for the event that created the booking. */
  @Enumerated(EnumType.STRING) @Column(name="from_status", length=12, updatable=false) private Booking.Status fromStatus;
  @Enumerated(EnumType.STRING) @Column(name="to_status", nullable=false, length=12, updatable=false) private Booking.Status toStatus;
  /** null when the system made the change (auto-expiry, payment webhook). */
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id", updatable=false) private User actor;
  /** PLAYER, FACILITY_ADMIN, SYSTEM or PAYMENT. */
  @Column(name="actor_role", nullable=false, length=20, updatable=false) private String actorRole;
  @Column(length=300, updatable=false) private String note;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();

  protected BookingEvent(){}
  public BookingEvent(Booking booking, Booking.Status from, Booking.Status to, User actor, String actorRole, String note){
    this.booking = booking; this.fromStatus = from; this.toStatus = to; this.actor = actor; this.actorRole = actorRole; this.note = note; }

  public Long getId(){ return id; }
  public Booking getBooking(){ return booking; }
  public Booking.Status getFromStatus(){ return fromStatus; }
  public Booking.Status getToStatus(){ return toStatus; }
  public User getActor(){ return actor; }
  public String getActorRole(){ return actorRole; }
  public String getNote(){ return note; }
  public Instant getCreatedAt(){ return createdAt; }
}
