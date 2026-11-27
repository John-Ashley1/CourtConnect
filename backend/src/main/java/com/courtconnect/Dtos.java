package com.courtconnect;
import jakarta.validation.constraints.*;
public final class Dtos {
  public record RegisterRequest(@NotBlank(message="Enter your full name.") String fullName,
    @NotBlank(message="Enter your email.") @Email(message="Enter a valid email address.") String email,
    @NotBlank(message="Enter a password.") @StrongPassword @Size(max=72, message="Password must be 72 characters or fewer.") String password) {}
  /** No password rule here on purpose: existing accounts must always be able to sign in. */
  public record LoginRequest(@NotBlank(message="Enter your email.") String email, @NotBlank(message="Enter your password.") String password) {}
  public record UserDto(Long id, String fullName, String email, Role role) {
    public static UserDto of(User u){ return new UserDto(u.getId(),u.getFullName(),u.getEmail(),u.getRole()); } }
  public record AuthResponse(String token, UserDto user) {}

  // ---- Increment 2: profile (FR-005) ----
  public record ProfileDto(Long id, String fullName, String email, String phoneNo, Role role, java.time.Instant createdAt) {
    public static ProfileDto of(User u){ return new ProfileDto(u.getId(),u.getFullName(),u.getEmail(),u.getPhoneNo(),u.getRole(),u.getCreatedAt()); } }
  /**
   * No id, role or email here: the user always comes from the JWT, the role can't be changed by the user,
   * and the email is permanent. An "email" sent in the JSON is ignored (unknown properties are skipped).
   */
  public record UpdateProfileRequest(
    @NotBlank(message="Enter your full name.") @Size(min=2, max=100, message="Full name must be 2 to 100 characters.") String fullName,
    @Size(max=20, message="Enter a mobile number like 09171234567, or leave it blank.") String phoneNo) {}

  // ---- Increment 2: change password (supports FR-003 / NFR-008; no dedicated FR in the SRS) ----
  /** Max 72: BCrypt ignores everything after 72 bytes. */
  public record ChangePasswordRequest(
    @NotBlank(message="Enter your current password.") String currentPassword,
    @NotBlank(message="Enter a new password.") @StrongPassword @Size(max=72, message="Password must be 72 characters or fewer.") String newPassword) {}
  /** A fresh token for this device; tokens on every other device stop working. */
  public record PasswordChangedResponse(String token, String message) {}

  // ---- Increment 2: forgot / reset password ----
  public record ForgotPasswordRequest(
    @NotBlank(message="Enter your email address.") @Email(regexp=".+@.+\\..+", message="Enter a valid email address, like name@example.com.") String email) {}
  public record ResetPasswordRequest(
    @NotBlank(message="This reset link is missing its code. Open the link from the email again.") String token,
    @NotBlank(message="Enter a new password.") @StrongPassword @Size(max=72, message="Password must be 72 characters or fewer.") String newPassword) {}
  public record MessageResponse(String message) {}
  /** role: so the page sends players to /signin and administrators to the Administrator sign-in page. */
  public record ResetPasswordResponse(String message, Role role) {}
}
