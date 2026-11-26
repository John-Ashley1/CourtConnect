package com.courtconnect;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A player's booking of one or more consecutive slots of a court (FR-015).
 * Date and times are copied from the slots, so the booking keeps its history after the slots are released.
 * Pending → Confirmed (paid) · Pending → Expired (not paid in time, FR-019) · Pending/Confirmed → Cancelled (FR-053, FR-018).
 */
@Entity @Table(name="booking", indexes={
  @Index(name="idx_booking_player", columnList="player_id"),
  @Index(name="idx_booking_court_date", columnList="court_id,slot_date"),
  @Index(name="idx_booking_status_deadline", columnList="status,payment_deadline")})
public class Booking {
  public enum Status { PENDING, CONFIRMED, CANCELLED, EXPIRED }

  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="player_id", nullable=false) private User player;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="court_id", nullable=false) private Court court;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=12) private Status status = Status.PENDING;
  /** Booking reference, also the QR code content, e.g. CC-2611-7KQ4M2. */
  @Column(name="qr_code", nullable=false, unique=true, length=20) private String qrCode;
  @Column(name="slot_date", nullable=false) private LocalDate slotDate;
  @Column(name="start_time", nullable=false) private LocalTime startTime;
  @Column(name="end_time", nullable=false) private LocalTime endTime;
  @Column(nullable=false, precision=5, scale=2) private BigDecimal hours;
  /** Court rate × hours, fixed when the booking is made (FR-021). */
  @Column(name="total_fee", nullable=false, precision=10, scale=2) private BigDecimal totalFee;
  @Column(name="payment_deadline", nullable=false) private Instant paymentDeadline;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();
  @Column(name="cancelled_at") private Instant cancelledAt;
  /** PLAYER or FACILITY_ADMIN. */
  @Column(name="cancelled_by", length=20) private String cancelledBy;

  public Long getId(){ return id; }
  public User getPlayer(){ return player; } public void setPlayer(User v){ player=v; }
  public Court getCourt(){ return court; } public void setCourt(Court v){ court=v; }
  public Status getStatus(){ return status; } public void setStatus(Status v){ status=v; }
  public String getQrCode(){ return qrCode; } public void setQrCode(String v){ qrCode=v; }
  public LocalDate getSlotDate(){ return slotDate; } public void setSlotDate(LocalDate v){ slotDate=v; }
  public LocalTime getStartTime(){ return startTime; } public void setStartTime(LocalTime v){ startTime=v; }
  public LocalTime getEndTime(){ return endTime; } public void setEndTime(LocalTime v){ endTime=v; }
  public BigDecimal getHours(){ return hours; } public void setHours(BigDecimal v){ hours=v; }
  public BigDecimal getTotalFee(){ return totalFee; } public void setTotalFee(BigDecimal v){ totalFee=v; }
  public Instant getPaymentDeadline(){ return paymentDeadline; } public void setPaymentDeadline(Instant v){ paymentDeadline=v; }
  public Instant getCreatedAt(){ return createdAt; }
  public Instant getCancelledAt(){ return cancelledAt; }
  public String getCancelledBy(){ return cancelledBy; }
  public void cancel(String by, Instant at){ status = Status.CANCELLED; cancelledBy = by; cancelledAt = at; }
  public boolean isActive(){ return status == Status.PENDING || status == Status.CONFIRMED; }
}
