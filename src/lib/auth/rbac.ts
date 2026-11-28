import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  getDashboardPathForRole,
  type AccountStatus,
  type AuthErrorCode,
  type SafeUser,
  type UserRole,
} from "@/types/auth";

export interface AccountStatusDenial {
  code: AuthErrorCode;
  message: string;
}

/**
 * Returns a safe, user-facing denial reason if the account status does not
 * permit login or protected access, or null if the account is eligible.
 */
export function getAccountStatusDenial(
  role: UserRole,
  status: AccountStatus
): AccountStatusDenial | null {
  if (role === "requester") {
    switch (status) {
      case "approved":
        return null;
      case "pending_approval":
        return {
          code: "ACCOUNT_PENDING_APPROVAL",
          message:
            "Your registration is currently pending administrator approval. You will be able to sign in once your account is approved.",
        };
      case "needs_correction":
        return {
          code: "ACCOUNT_NEEDS_CORRECTION",
          message:
            "Your registration requires correction before approval. Please contact the Registrar's Office or watch for correction instructions.",
        };
      case "rejected":
        return {
          code: "ACCOUNT_REJECTED",
          message:
            "Your registration was not approved. Please contact the Registrar's Office for assistance.",
        };
      case "inactive":
      default:
        return {
          code: "ACCOUNT_INACTIVE",
          message:
            "This account is currently inactive. Please contact the Registrar's Office for assistance.",
        };
    }
  }

  // Staff and Admin accounts
  switch (status) {
    case "active":
      return null;
    case "invitation_pending":
      return {
        code: "ACCOUNT_INVITATION_PENDING",
        message:
          "Your account setup is still pending activation. Please contact an administrator.",
      };
    case "inactive":
    default:
      return {
        code: "ACCOUNT_INACTIVE",
        message:
          "This account is currently inactive. Please contact an administrator.",
      };
  }
}

export type ApiAuthResult =
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse };

/**
 * Reusable backend API guard enforcing authentication, account eligibility,
 * and optional role-based authorization.
 */
export async function requireApiAuth(
  allowedRoles?: readonly UserRole[],
  options?: { allowPendingPasswordChange?: boolean }
): Promise<ApiAuthResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Authentication required. Please sign in to continue.",
          code: "UNAUTHENTICATED" satisfies AuthErrorCode,
        },
        { status: 401 }
      ),
    };
  }

  if (user.mustChangePassword && !options?.allowPendingPasswordChange) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "You must change your temporary password before accessing this resource.",
          code: "PASSWORD_CHANGE_REQUIRED" satisfies AuthErrorCode,
        },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "You do not have permission to access this resource.",
          code: "FORBIDDEN" satisfies AuthErrorCode,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}

/**
 * Reusable Server Component guard for role-protected dashboard pages.
 * Runs on the server before rendering so unauthorized content never flashes.
 */
export async function requirePageRole(
  expectedRole: UserRole
): Promise<SafeUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/auth/change-password");
  }

  if (user.role !== expectedRole) {
    redirect(getDashboardPathForRole(user.role));
  }

  return user;
}
