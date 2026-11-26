package com.courtconnect;
import jakarta.persistence.*;
import java.time.LocalTime;

/** Weekly operating hours of a court, one row per day (FR-011). day_of_week: 0 = Sunday … 6 = Saturday. */
@Entity @Table(name="court_hours", uniqueConstraints=@UniqueConstraint(columnNames={"court_id","day_of_week"}))
public class CourtHours {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="court_id", nullable=false) private Court court;
  @Column(name="day_of_week", nullable=false) private int dayOfWeek;
  @Column(name="is_open", nullable=false) private boolean open;
  @Column(name="open_time", nullable=false) private LocalTime openTime;
  @Column(name="close_time", nullable=false) private LocalTime closeTime;

  protected CourtHours(){}
  public CourtHours(Court court, int dayOfWeek, boolean open, LocalTime openTime, LocalTime closeTime){
    this.court=court; this.dayOfWeek=dayOfWeek; this.open=open; this.openTime=openTime; this.closeTime=closeTime; }

  public Court getCourt(){ return court; }
  public int getDayOfWeek(){ return dayOfWeek; }
  public boolean isOpen(){ return open; } public void setOpen(boolean v){ open=v; }
  public LocalTime getOpenTime(){ return openTime; } public void setOpenTime(LocalTime v){ openTime=v; }
  public LocalTime getCloseTime(){ return closeTime; } public void setCloseTime(LocalTime v){ closeTime=v; }
}
