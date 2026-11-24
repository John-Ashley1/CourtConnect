package com.courtconnect;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;
import java.lang.annotation.*;

/**
 * The one password rule for NEW passwords (register, change password, reset password):
 * at least 8 characters, with at least one letter and at least one number.
 *
 * Not used at login on purpose, so older accounts (e.g. admins with number-only passwords)
 * can still sign in and then change to a stronger password.
 * A null value passes here; pair it with @NotBlank. The 72-character maximum (BCrypt limit) is a separate @Size.
 */
@Documented
@Constraint(validatedBy = {})
@Pattern(regexp = StrongPassword.REGEX)
@ReportAsSingleViolation
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {
  /** 8+ characters, at least one letter (A–Z, a–z) and one digit (0–9). */
  String REGEX = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$";
  String MESSAGE = "Password must be at least 8 characters and include a letter and a number.";

  String message() default MESSAGE;
  Class<?>[] groups() default {};
  Class<? extends Payload>[] payload() default {};
}
