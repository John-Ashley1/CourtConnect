package com.courtconnect;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/** One attempt to pay a booking through PayMongo (FR-022 – FR-025). The newest attempt is the booking's payment. */
@Entity @Table(name="payment", indexes=@Index(name="idx_payment_booking", columnList="booking_id"))
public class Payment {
  public enum Status { PENDING, PAID, FAILED }

  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="booking_id", nullable=false) private Booking booking;
  /** PayMongo checkout session id (cs_…). */
  @Column(name="paymongo_reference", unique=true, length=100) private String paymongoReference;
  /** PayMongo payment id (pay_…) once paid. */
  @Column(name="paymongo_payment_id", length=100) private String paymongoPaymentId;
  @Column(nullable=false, length=30) private String method;
  @Column(nullable=false, precision=10, scale=2) private BigDecimal amount;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=10) private Status status = Status.PENDING;
  @Column(name="paid_at") private Instant paidAt;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();

  protected Payment(){}
  public Payment(Booking booking, String method, BigDecimal amount){ this.booking=booking; this.method=method; this.amount=amount; }

  public Long getId(){ return id; }
  public Booking getBooking(){ return booking; }
  public String getPaymongoReference(){ return paymongoReference; } public void setPaymongoReference(String v){ paymongoReference=v; }
  public String getPaymongoPaymentId(){ return paymongoPaymentId; }
  public String getMethod(){ return method; }
  public BigDecimal getAmount(){ return amount; }
  public Status getStatus(){ return status; } public void setStatus(Status v){ status=v; }
  public Instant getPaidAt(){ return paidAt; }
  public void markPaid(String paymentId, Instant at){ status = Status.PAID; paymongoPaymentId = paymentId; paidAt = at; }
}
