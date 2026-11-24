package com.courtconnect;
import com.courtconnect.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.regex.Pattern;

/** Profile (FR-005) and change-password (Increment 2; no dedicated FR in the SRS) rules. Always works on the signed-in user's id taken from the JWT. */
@Service
public class UserService {
  private static final Pattern PH_MOBILE = Pattern.compile("^09\\d{9}$");
  private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
  public UserService(UserRepository users, PasswordEncoder encoder, JwtService jwt){ this.users = users; this.encoder = encoder; this.jwt = jwt; }

  @Transactional(readOnly = true)
  public ProfileDto profile(Long userId){ return ProfileDto.of(load(userId)); }

  @Transactional
  public ProfileDto update(Long userId, UpdateProfileRequest r){
    User u = load(userId);

    String name = r.fullName().trim();
    if (name.length() < 2 || name.length() > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "fullName", "Full name must be 2 to 100 characters.");

    // Email is permanent: it isn't part of the request and is never changed here.

    // Optional; spaces and dashes are allowed when typing ("0917 123 4567") and removed before saving.
    String phone = r.phoneNo() == null ? "" : r.phoneNo().replaceAll("[\\s-]", "");
    if (!phone.isEmpty() && !PH_MOBILE.matcher(phone).matches())
      throw new ApiException(HttpStatus.BAD_REQUEST, "phoneNo", "Enter a mobile number like 09171234567, or leave it blank.");

    u.setFullName(name); u.setPhoneNo(phone.isEmpty() ? null : phone);
    return ProfileDto.of(users.save(u));
  }

  /**
   * A wrong current password is a 400 on that field, not a 401: the frontend treats 401
   * as "session ended" and would sign the user out.
   */
  @Transactional
  public PasswordChangedResponse changePassword(Long userId, ChangePasswordRequest r){
    User u = load(userId);
    if (!encoder.matches(r.currentPassword(), u.getPasswordHash()))
      throw new ApiException(HttpStatus.BAD_REQUEST, "currentPassword", "Your current password is incorrect.");
    if (encoder.matches(r.newPassword(), u.getPasswordHash()))
      throw new ApiException(HttpStatus.BAD_REQUEST, "newPassword", "Choose a password different from your current one.");
    u.setPasswordHash(encoder.encode(r.newPassword()));
    u.invalidateTokens();   // every token issued before now stops working → other devices are signed out
    users.save(u);
    return new PasswordChangedResponse(jwt.generate(u), "Password changed. You’ve been signed out on your other devices.");
  }

  User load(Long userId){
    return users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Sign in to continue."));
  }
}
