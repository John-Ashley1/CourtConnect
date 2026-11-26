package com.courtconnect;
import jakarta.persistence.*;
import org.hibernate.annotations.Check;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * One bookable period of a court on a date (FR-013), with its status (FR-014).
 * `booking` is the booking currently holding the slot (Pending or Booked); it is cleared when the slot is released.
 * The unique key on (court, date, start) means the same period can never exist twice.
 * Database rule (FR-016): a slot is Pending/Booked exactly when it points to a booking. With a single booking_id
 * column, one slot can never be held by two bookings, whatever the application code does.
 */
@Entity @Check(name="ck_time_slot_holder", constraints="(status in ('PENDING','BOOKED')) = (booking_id is not null)")
@Table(name="time_slot",
  uniqueConstraints=@UniqueConstraint(columnNames={"court_id","slot_date","start_time"}),
  indexes=@Index(name="idx_time_slot_court_date", columnList="court_id,slot_date"))
public class TimeSlot {
  public enum Status { AVAILABLE, PENDING, BOOKED, BLOCKED }

  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="court_id", nullable=false) private Court court;
  @Column(name="slot_date", nullable=false) private LocalDate slotDate;
  @Column(name="start_time", nullable=false) private LocalTime startTime;
  @Column(name="end_time", nullable=false) private LocalTime endTime;
  @Enumerated(EnumType.STRING) @Column(nullable=false, length=12) private Status status = Status.AVAILABLE;
  @Column(name="block_reason", length=40) private String blockReason;
  @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="booking_id") private Booking booking;

  protected TimeSlot(){}
  public TimeSlot(Court court, LocalDate date, LocalTime start, LocalTime end){
    this.court=court; this.slotDate=date; this.startTime=start; this.endTime=end; }

  public Long getId(){ return id; }
  public Court getCourt(){ return court; }
  public LocalDate getSlotDate(){ return slotDate; }
  public LocalTime getStartTime(){ return startTime; }
  public LocalTime getEndTime(){ return endTime; }
  public Status getStatus(){ return status; }
  public String getBlockReason(){ return blockReason; }
  public Booking getBooking(){ return booking; }

  public void hold(Booking b){ status = Status.PENDING; booking = b; }
  public void book(){ status = Status.BOOKED; }
  public void block(String reason){ status = Status.BLOCKED; blockReason = reason; }
  /** Back to Available for everyone (cancelled, expired or unblocked). */
  public void release(){ status = Status.AVAILABLE; booking = null; blockReason = null; }
}
