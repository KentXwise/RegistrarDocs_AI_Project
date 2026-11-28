import type {
  RegistrationFormErrors,
  RegistrationFormValues,
} from "@/types/registration";

export const ACCEPTED_ID_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
] as const;

export const ACCEPTED_ID_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export const MAX_ID_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Configurable list of verified official DNSC email domains.
 * Left empty until the institution's official student email domain is confirmed.
 * When populated (e.g. ["dnsc.edu.ph"]), validateDnscEmail will automatically
 * enforce that submitted email addresses belong to a listed domain.
 */
export const CONFIRMED_DNSC_EMAIL_DOMAINS: readonly string[] = [];

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateFullName(value: string): string | undefined {
  if (!value.trim()) {
    return "Please enter your full name.";
  }
  return undefined;
}

export function sanitizeStudentIdInput(value: string): string {
  return value.replace(/[^0-9-]/g, "");
}

export function validateStudentId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter your Student ID Number (e.g., 2021-00440).";
  }
  if (!/^[0-9-]+$/.test(trimmed)) {
    return "Student ID Number may only contain numbers (0-9) and dashes (-).";
  }
  return undefined;
}

export function validateDnscEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter your DNSC email account.";
  }
  if (!BASIC_EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address.";
  }

  if (CONFIRMED_DNSC_EMAIL_DOMAINS.length > 0) {
    const domain = trimmed.split("@")[1]?.toLowerCase() ?? "";
    const isAllowed = CONFIRMED_DNSC_EMAIL_DOMAINS.some(
      (allowed) => domain === allowed.toLowerCase()
    );
    if (!isAllowed) {
      return `Please use an official DNSC email address (${CONFIRMED_DNSC_EMAIL_DOMAINS.join(", ")}).`;
    }
  }

  return undefined;
}

export function validateStudentIdImage(file: File | null): string | undefined {
  if (!file) {
    return "Please upload a clear photo of your DNSC Student ID.";
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ACCEPTED_ID_IMAGE_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const hasAllowedMime =
    file.type === ""
      ? hasAllowedExtension
      : (ACCEPTED_ID_IMAGE_MIME_TYPES as readonly string[]).includes(
          file.type.toLowerCase()
        );

  if (!hasAllowedExtension || !hasAllowedMime) {
    return "Unsupported file format. Please upload a JPG, JPEG, or PNG image.";
  }

  if (file.size <= 0) {
    return "The selected file appears to be empty. Please choose a valid image.";
  }

  if (file.size > MAX_ID_IMAGE_SIZE_BYTES) {
    return "Image exceeds the 5 MB size limit. Please choose a smaller file.";
  }

  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) {
    return "Please create a password.";
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (confirmPassword !== password) {
    return "Passwords do not match.";
  }
  return undefined;
}

export function validatePrivacyAcknowledged(
  checked: boolean
): string | undefined {
  if (!checked) {
    return "Please acknowledge how your registration information will be used.";
  }
  return undefined;
}

export function validateRegistrationForm(
  values: RegistrationFormValues
): RegistrationFormErrors {
  const errors: RegistrationFormErrors = {};

  const fullNameError = validateFullName(values.fullName);
  if (fullNameError) errors.fullName = fullNameError;

  const studentIdError = validateStudentId(values.studentId);
  if (studentIdError) errors.studentId = studentIdError;

  const dnscEmailError = validateDnscEmail(values.dnscEmail);
  if (dnscEmailError) errors.dnscEmail = dnscEmailError;

  const studentIdImageError = validateStudentIdImage(values.studentIdImage);
  if (studentIdImageError) errors.studentIdImage = studentIdImageError;

  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;

  const confirmPasswordError = validateConfirmPassword(
    values.password,
    values.confirmPassword
  );
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  const privacyError = validatePrivacyAcknowledged(values.privacyAcknowledged);
  if (privacyError) errors.privacyAcknowledged = privacyError;

  return errors;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
