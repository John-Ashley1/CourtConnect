package com.courtconnect;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="app_user")
public class User {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  @Column(nullable=false) private String fullName;
  @Column(nullable=false, unique=true) private String email;
  @Column(nullable=false) private String passwordHash;
  @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role = Role.PLAYER;
  @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
  // Increment 2: optional PH mobile number (ERD: phone_no VARCHAR(20))
  @Column(name="phone_no", length=20) private String phoneNo;
  // Increment 2: increased on password change/reset; JWTs carrying an older version are rejected
  @Column(name="token_version", nullable=false, columnDefinition="integer not null default 0") private int tokenVersion = 0;

  public Long getId(){return id;} public String getFullName(){return fullName;} public void setFullName(String v){fullName=v;}
  public String getEmail(){return email;} public void setEmail(String v){email=v;}
  public String getPasswordHash(){return passwordHash;} public void setPasswordHash(String v){passwordHash=v;}
  public Role getRole(){return role;} public void setRole(Role v){role=v;}
  public Instant getCreatedAt(){return createdAt;}
  public String getPhoneNo(){return phoneNo;} public void setPhoneNo(String v){phoneNo=v;}
  public int getTokenVersion(){return tokenVersion;}
  /** Signs the user out everywhere: every token issued before this call stops working. */
  public void invalidateTokens(){ tokenVersion++; }
}
