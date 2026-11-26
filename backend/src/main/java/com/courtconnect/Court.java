package com.courtconnect;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/** A bookable court at a facility (FR-008, FR-009). Slot length and payment hold time are per court (FR-011, FR-019). */
@Entity @Table(name="court")
public class Court {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="facility_id", nullable=false) private Facility facility;
  @Column(name="court_name", nullable=false, length=60) private String courtName;
  @Column(name="sport_type", nullable=false, length=30) private String sportType;
  @Column(name="is_indoor", nullable=false) private boolean indoor = true;
  /** Pesos per hour. */
  @Column(name="rental_rate", nullable=false, precision=10, scale=2) private BigDecimal rentalRate;
  @Column(name="slot_minutes", nullable=false) private int slotMinutes = 60;
  /** How long an unpaid Pending booking keeps its slots (5–60 minutes). */
  @Column(name="payment_hold_minutes", nullable=false) private int paymentHoldMinutes = 15;
  @Column(name="photo_url", length=500) private String photoUrl;
  /** Removed courts are hidden everywhere but kept so past bookings still show their court. */
  @Column(nullable=false) private boolean removed;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();

  public Long getId(){ return id; }
  public Facility getFacility(){ return facility; } public void setFacility(Facility v){ facility=v; }
  public String getCourtName(){ return courtName; } public void setCourtName(String v){ courtName=v; }
  public String getSportType(){ return sportType; } public void setSportType(String v){ sportType=v; }
  public boolean isIndoor(){ return indoor; } public void setIndoor(boolean v){ indoor=v; }
  public BigDecimal getRentalRate(){ return rentalRate; } public void setRentalRate(BigDecimal v){ rentalRate=v; }
  public int getSlotMinutes(){ return slotMinutes; } public void setSlotMinutes(int v){ slotMinutes=v; }
  public int getPaymentHoldMinutes(){ return paymentHoldMinutes; } public void setPaymentHoldMinutes(int v){ paymentHoldMinutes=v; }
  public String getPhotoUrl(){ return photoUrl; } public void setPhotoUrl(String v){ photoUrl=v; }
  public boolean isRemoved(){ return removed; } public void setRemoved(boolean v){ removed=v; }
}
