package com.courtconnect;
import com.courtconnect.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * The signed-in user's own account. There is deliberately no /api/users/{id}:
 * the user is always the one in the JWT, so nobody can read or edit someone else's profile.
 */
@RestController @RequestMapping("/api/users")
public class UserController {
  private final UserService service;
  public UserController(UserService service){ this.service = service; }

  @GetMapping("/me")
  public ProfileDto me(@AuthenticationPrincipal User me){ return service.profile(me.getId()); }

  @PutMapping("/me")
  public ProfileDto update(@AuthenticationPrincipal User me, @Valid @RequestBody UpdateProfileRequest r){ return service.update(me.getId(), r); }

  @PostMapping("/me/password")
  public PasswordChangedResponse changePassword(@AuthenticationPrincipal User me, @Valid @RequestBody ChangePasswordRequest r){
    return service.changePassword(me.getId(), r); }
}
