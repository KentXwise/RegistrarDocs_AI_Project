/**
 * Future account approval lifecycle statuses prepared for upcoming
 * authentication and admin-approval milestones.
 */
export type RegistrationAccountStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "needs_correction";

/**
 * Primary system roles defined in the RegistrarDocs AI proposal.
 */
export type PortalUserRole =
  | "requester"
  | "registrar_staff"
  | "administrator";

export interface RegistrationFormValues {
  fullName: string;
  studentId: string;
  dnscEmail: string;
  studentIdImage: File | null;
  password: string;
  confirmPassword: string;
  privacyAcknowledged: boolean;
}

export type RegistrationFieldName = keyof RegistrationFormValues;

export type RegistrationFormErrors = Partial<
  Record<RegistrationFieldName, string>
>;
