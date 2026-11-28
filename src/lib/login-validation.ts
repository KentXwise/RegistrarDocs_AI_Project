import type { LoginFormErrors, LoginFormValues } from "@/types/login";

export function validateLoginIdentifier(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter your email or Student ID.";
  }
  return undefined;
}

export function validateLoginPassword(value: string): string | undefined {
  if (!value.trim()) {
    return "Please enter your password.";
  }
  return undefined;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  const identifierError = validateLoginIdentifier(values.identifier);
  if (identifierError) {
    errors.identifier = identifierError;
  }

  const passwordError = validateLoginPassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}
