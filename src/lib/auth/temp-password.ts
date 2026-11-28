import crypto from "node:crypto";

// Unambiguous character sets (excludes 0, O, o, 1, l, I) for readable manual entry
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

/**
 * Generates a cryptographically secure, 14-character temporary password using
 * Node.js `crypto.randomInt` (never `Math.random`). Guarantees at least one
 * uppercase, lowercase, digit, and special symbol, then Fisher-Yates shuffles.
 */
export function generateSecureTemporaryPassword(length = 14): string {
  const safeLength = Math.max(12, length);
  const chars: string[] = [
    UPPER[crypto.randomInt(UPPER.length)],
    LOWER[crypto.randomInt(LOWER.length)],
    DIGITS[crypto.randomInt(DIGITS.length)],
    SYMBOLS[crypto.randomInt(SYMBOLS.length)],
  ];

  for (let i = chars.length; i < safeLength; i += 1) {
    chars.push(ALL[crypto.randomInt(ALL.length)]);
  }

  // Cryptographically secure Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join("");
}

/**
 * Validates new password strength for forced first-login change & password reset.
 */
export function validateNewPasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one uppercase letter, one lowercase letter, and one number.";
  }
  return null;
}
