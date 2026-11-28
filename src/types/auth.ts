export const USER_ROLES = ["requester", "staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "pending_approval",
  "approved",
  "needs_correction",
  "rejected",
  "invitation_pending",
  "active",
  "inactive",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  studentId: string | null;
  employeeId: string | null;
  institute: string | null;
  program: string | null;
  role: UserRole;
  status: AccountStatus;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "ACADEMIC_PROFILE_INCOMPLETE"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_STUDENT_ID"
  | "ACCOUNT_PENDING_APPROVAL"
  | "ACCOUNT_NEEDS_CORRECTION"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_INVITATION_PENDING"
  | "ACCOUNT_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "RATE_LIMITED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "SUPABASE_NOT_CONFIGURED"
  | "SERVER_ERROR";

export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "requester":
      return "/dashboard/requester";
    case "staff":
      return "/dashboard/staff";
    case "admin":
      return "/dashboard/admin";
  }
}

export function isAccountEligibleForAccess(
  role: UserRole,
  status: AccountStatus
): boolean {
  if (role === "requester") {
    return status === "approved";
  }
  return status === "active";
}
