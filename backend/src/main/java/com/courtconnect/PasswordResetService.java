package com.courtconnect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/** Forgot / reset password (Increment 2; no dedicated FR in the SRS). */
@Service
public class PasswordResetService {
  public static final Duration TTL = Duration.ofMinutes(30);
  private static final Duration COOLDOWN = Duration.ofSeconds(60);   // one link per minute per account
  private static final String INVALID = "This reset link is invalid, has already been used, or has expired. Request a new one.";
  private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
  private static final SecureRandom RANDOM = new SecureRandom();

  private final UserRepository users; private final PasswordResetTokenRepository tokens;
  private final PasswordEncoder encoder; private final ResetLinkSender sender; private final String frontendUrl;

  public PasswordResetService(UserRepository users, PasswordResetTokenRepository tokens, PasswordEncoder encoder,
                              ResetLinkSender sender, @Value("${app.frontend-url}") String frontendUrl){
    this.users=users; this.tokens=tokens; this.encoder=encoder; this.sender=sender;
    this.frontendUrl = frontendUrl.replaceAll("/+$", "");
  }

  /**
   * Always succeeds from the caller's point of view: the response never says whether the
   * email belongs to an account, so the form can't be used to discover who is registered.
   */
  @Transactional
  public void requestReset(String rawEmail){
    String email = rawEmail.trim().toLowerCase();
    users.findByEmail(email).ifPresent(u -> {
      Instant now = Instant.now();
      boolean tooSoon = tokens.findFirstByUserOrderByCreatedAtDesc(u)
        .map(t -> t.getCreatedAt().isAfter(now.minus(COOLDOWN))).orElse(false);
      if (tooSoon) { log.info("Password reset for {} requested again within {}s; no new link sent.", email, COOLDOWN.toSeconds()); return; }

      tokens.expireAllFor(u, now);                       // older links stop working
      String raw = newToken();
      tokens.save(new PasswordResetToken(u, sha256(raw), now.plus(TTL)));
      sender.send(u, frontendUrl + "/reset-password?token=" + raw, TTL);
    });
  }

  @Transactional
  public void resetPassword(String rawToken, String newPassword){
    Instant now = Instant.now();
    PasswordResetToken t = tokens.findByTokenHash(sha256(rawToken.trim()))
      .filter(x -> x.isUsable(now))
      .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "token", INVALID));
    User u = t.getUser();
    u.setPasswordHash(encoder.encode(newPassword));
    u.invalidateTokens();                                // signed out on every device
    users.save(u);
    tokens.expireAllFor(u, now);                         // this link (and any other) is now used
  }

  private static String newToken(){
    byte[] b = new byte[32];
    RANDOM.nextBytes(b);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
  }

  static String sha256(String s){
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); }
    catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
  }
}
