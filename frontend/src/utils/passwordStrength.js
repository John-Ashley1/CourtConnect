// Password rule + strength meter for NEW passwords (register, change password, reset password).
// The rule matches the backend's @StrongPassword (backend/.../StrongPassword.java).
// Never used at sign-in, so older accounts with weaker passwords can still sign in and change it.

/** Accepted = 8+ characters with at least one letter (A–Z, a–z) and one digit (0–9), i.e. Fair or better. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
export const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters and include a letter and a number.'
export const PASSWORD_ADVICE = 'For your security, use at least 8 characters with at least one letter and one number. Adding uppercase letters and symbols makes it stronger.'
export const PASSWORD_MAX = 72 // BCrypt only uses the first 72 bytes

// Text colours are readable on white (contrast: red 6.5:1, orange 5.2:1, green 5.3:1).
const RED = '#B91C1C', ORANGE = '#C2410C', GREEN = '#0B7A5A'
export const STRENGTH_LEVELS = [
  { label: 'Too short', color: RED, bars: 1 },
  { label: 'Weak', color: RED, bars: 1 },
  { label: 'Fair', color: ORANGE, bars: 2 },
  { label: 'Good', color: GREEN, bars: 3 },
  { label: 'Strong', color: GREEN, bars: 4 },
]

/**
 * 0 Too short — under 8 characters
 * 1 Weak      — 8+ but missing a letter or a number (e.g. only numbers or only letters)
 * 2 Fair      — has a letter and a number
 * 3 Good      — Fair + both uppercase and lowercase letters
 * 4 Strong    — Good + a special character (anything not a letter or digit, e.g. ! @ #)
 */
export function passwordScore(pw = '') {
  if (pw.length < 8) return 0
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 1
  if (!(/[A-Z]/.test(pw) && /[a-z]/.test(pw))) return 2
  if (!/[^A-Za-z0-9]/.test(pw)) return 3
  return 4
}

export const passwordStrength = (pw = '') => ({ score: passwordScore(pw), ...STRENGTH_LEVELS[passwordScore(pw)] })

/** Fair, Good and Strong are accepted (same as PASSWORD_REGEX and the backend). */
export const isAcceptedPassword = (pw = '') => PASSWORD_REGEX.test(pw)

/** Error for a new-password field, or null when it can be submitted. */
export function newPasswordError(pw = '', emptyMessage = 'Enter a password.') {
  if (!pw) return emptyMessage
  if (pw.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`
  return isAcceptedPassword(pw) ? null : PASSWORD_RULE_MESSAGE
}
