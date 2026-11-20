package com.courtconnect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the first system administrator on startup, because nobody can register as one.
 * Runs only when ADMIN_EMAIL and ADMIN_PASSWORD environment variables are set, and only if
 * that email doesn't exist yet. Existing accounts are never changed.
 */
@Component
public class AdminBootstrap implements CommandLineRunner {
  private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
  private final UserRepository users; private final PasswordEncoder encoder;
  private final String email, password, name;

  public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
      @Value("${app.bootstrap-admin.email:}") String email,
      @Value("${app.bootstrap-admin.password:}") String password,
      @Value("${app.bootstrap-admin.name:System Administrator}") String name) {
    this.users = users; this.encoder = encoder;
    this.email = email.trim().toLowerCase(); this.password = password; this.name = name.trim();
  }

  @Override public void run(String... args) {
    if (email.isEmpty() || password.isEmpty()) return;
    if (users.existsByEmail(email)) { log.info("System admin bootstrap skipped: {} already exists.", email); return; }
    if (password.length() < 8) { log.warn("System admin bootstrap skipped: ADMIN_PASSWORD must be at least 8 characters."); return; }
    User u = new User(); u.setFullName(name); u.setEmail(email);
    u.setPasswordHash(encoder.encode(password)); u.setRole(Role.SYSTEM_ADMIN);
    users.save(u);
    log.info("Created system administrator account {}.", email);
  }
}
