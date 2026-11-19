package com.courtconnect;
import com.courtconnect.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController @RequestMapping("/api/auth")
public class AuthController {
  private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
  public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt){ this.users=users; this.encoder=encoder; this.jwt=jwt; }
  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest r){
    String email = r.email().trim().toLowerCase();
    if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
    User u = new User(); u.setFullName(r.fullName().trim()); u.setEmail(email);
    u.setPasswordHash(encoder.encode(r.password())); u.setRole(Role.PLAYER);   // self-registration creates players only
    users.save(u); return new AuthResponse(jwt.generate(u), UserDto.of(u));
  }
  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest r){
    User u = users.findByEmail(r.email().trim().toLowerCase()).filter(x -> encoder.matches(r.password(), x.getPasswordHash()))
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password."));
    return new AuthResponse(jwt.generate(u), UserDto.of(u));
  }
  @GetMapping("/me") public UserDto me(@AuthenticationPrincipal User u){ return UserDto.of(u); }
}
