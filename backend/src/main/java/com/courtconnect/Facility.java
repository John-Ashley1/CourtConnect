package com.courtconnect;
import jakarta.persistence.*;
import java.time.Instant;

/** A sports facility registered by a facility administrator (FR-007). latitude/longitude come from geocoding the address (OpenStreetMap) (FR-010). */
@Entity @Table(name="facility")
public class Facility {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) @JoinColumn(name="admin_id", nullable=false) private User admin;
  @Column(nullable=false, length=100) private String name;
  @Column(nullable=false, length=20) private String phone;
  /** Full address shown to players: "street, city". */
  @Column(nullable=false, length=255) private String address;
  @Column(nullable=false, length=100) private String city;
  @Column(nullable=false) private double latitude;
  @Column(nullable=false) private double longitude;
  @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt = Instant.now();

  public Long getId(){ return id; }
  public User getAdmin(){ return admin; } public void setAdmin(User v){ admin=v; }
  public String getName(){ return name; } public void setName(String v){ name=v; }
  public String getPhone(){ return phone; } public void setPhone(String v){ phone=v; }
  public String getAddress(){ return address; } public void setAddress(String v){ address=v; }
  public String getCity(){ return city; } public void setCity(String v){ city=v; }
  public double getLatitude(){ return latitude; } public void setLatitude(double v){ latitude=v; }
  public double getLongitude(){ return longitude; } public void setLongitude(double v){ longitude=v; }
  public Instant getCreatedAt(){ return createdAt; }
}
