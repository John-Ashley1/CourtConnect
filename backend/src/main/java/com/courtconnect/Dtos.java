package com.courtconnect;
import jakarta.validation.constraints.*;
public final class Dtos {
  public record RegisterRequest(@NotBlank(message="Enter your full name.") String fullName,
    @NotBlank(message="Enter your email.") @Email(message="Enter a valid email address.") String email,
    @NotBlank @Size(min=8, message="Password must be at least 8 characters.") String password) {}
  public record LoginRequest(@NotBlank(message="Enter your email.") String email, @NotBlank(message="Enter your password.") String password) {}
  public record UserDto(Long id, String fullName, String email, Role role) {
    public static UserDto of(User u){ return new UserDto(u.getId(),u.getFullName(),u.getEmail(),u.getRole()); } }
  public record AuthResponse(String token, UserDto user) {}
}
