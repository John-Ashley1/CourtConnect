package com.courtconnect;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
@Service
public class JwtService {
  private final SecretKey key; private final long ttl;
  public JwtService(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-ms}") long ttl){
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.ttl = ttl; }

  /**
   * Subject = user id (not email), so changing the email in the profile doesn't sign the user out.
   * "ver" = the user's token version; raising it invalidates every older token (password change/reset).
   */
  public String generate(User u){
    return Jwts.builder().subject(String.valueOf(u.getId()))
      .claim("role", u.getRole().name()).claim("ver", u.getTokenVersion())
      .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+ttl)).signWith(key).compact(); }

  /** Verifies signature and expiry; throws JwtException if invalid. */
  public Claims parse(String token){ return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
}
