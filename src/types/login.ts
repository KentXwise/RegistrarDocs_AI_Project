import type { RegistrationAccountStatus } from "@/types/registration";

export interface LoginFormValues {
  identifier: string;
  password: string;
}

export type LoginFieldName = keyof LoginFormValues;

export type LoginFormErrors = Partial<Record<LoginFieldName, string>>;

/**
 * Account approval statuses that future backend authentication must verify
 * before granting requester access.
 */
export type LoginEligibilityStatus = RegistrationAccountStatus;
