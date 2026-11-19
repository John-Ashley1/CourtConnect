package com.courtconnect;
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
  public String generate(User u){
    return Jwts.builder().subject(u.getEmail()).claim("role",u.getRole().name()).issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis()+ttl)).signWith(key).compact(); }
  public String subject(String token){ return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
}
