import { generateSecureTemporaryPassword } from "@/lib/auth/temp-password";
import {
  listAdminAuditLogs,
  recordAdminAuditLog,
  type AdminAuditLogRecord,
} from "@/lib/db/admin-audit";
import { createNotification } from "@/lib/db/notifications";
import {
  sendStaffOnboardingEmail,
  type EmailDeliveryResult,
} from "@/lib/email/mailer";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AccountStatus, SafeUser, UserRole } from "@/types/auth";

export interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  studentId: string | null;
  employeeId: string | null;
  institute: string | null;
  program: string | null;
  role: UserRole;
  status: AccountStatus;
  hasStudentIdImage: boolean;
  studentIdImageMime: string | null;
  studentIdImageSize: number | null;
  approvalRemarks: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface RawAdminProfileRow {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  employee_id: string | null;
  institute?: string | null;
  program?: string | null;
  role: UserRole;
  status: AccountStatus;
  student_id_image_path: string | null;
  student_id_image_mime: string | null;
  student_id_image_size: number | null;
  approval_remarks?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

function mapAdminUserRow(row: RawAdminProfileRow): AdminUserRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    studentId: row.student_id,
    employeeId: row.employee_id,
    institute: row.institute ?? null,
    program: row.program ?? null,
    role: row.role,
    status: row.status,
    hasStudentIdImage: Boolean(row.student_id_image_path),
    studentIdImageMime: row.student_id_image_mime,
    studentIdImageSize: row.student_id_image_size,
    approvalRemarks: row.approval_remarks ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function isMissingColumn(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

const FULL_PROFILE_SELECT =
  "id, full_name, email, student_id, employee_id, institute, program, role, status, student_id_image_path, student_id_image_mime, student_id_image_size, approval_remarks, reviewed_at, created_at, updated_at, last_login_at";
const BASE_PROFILE_SELECT =
  "id, full_name, email, student_id, employee_id, role, status, student_id_image_path, student_id_image_mime, student_id_image_size, created_at, updated_at, last_login_at";

export async function listAdminUsers(options?: {
  role?: UserRole | "all";
  status?: AccountStatus | "all";
  search?: string;
}): Promise<{ ok: true; users: AdminUserRecord[] } | { ok: false; error: string }> {
  try {
    const admin = createSupabaseAdminClient();
    let query = admin
      .from("profiles")
      .select(FULL_PROFILE_SELECT)
      .order("created_at", { ascending: false });

    if (options?.role && options.role !== "all") {
      query = query.eq("role", options.role);
    }
    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    let { data, error } = await query;

    if (error && isMissingColumn(error.message)) {
      let fallback = admin
        .from("profiles")
        .select(BASE_PROFILE_SELECT)
        .order("created_at", { ascending: false });
      if (options?.role && options.role !== "all") {
        fallback = fallback.eq("role", options.role);
      }
      if (options?.status && options.status !== "all") {
        fallback = fallback.eq("status", options.status);
      }
      const res = await fallback;
      data = res.data as typeof data;
      error = res.error;
    }

    if (error) {
      return { ok: false, error: "Unable to load user accounts." };
    }

    let users = ((data ?? []) as unknown as RawAdminProfileRow[]).map(
      mapAdminUserRow
    );

    const q = options?.search?.trim().toLowerCase();
    if (q) {
      users = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.studentId?.toLowerCase().includes(q) ?? false) ||
          (u.employeeId?.toLowerCase().includes(q) ?? false)
      );
    }

    return { ok: true, users };
  } catch {
    return { ok: false, error: "Unable to connect to the database." };
  }
}

export async function getAdminUserStudentIdImageMeta(
  userId: string
): Promise<{ path: string; mime: string | null } | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("student_id_image_path, student_id_image_mime")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    student_id_image_path: string | null;
    student_id_image_mime: string | null;
  };
  if (!row.student_id_image_path) return null;
  return { path: row.student_id_image_path, mime: row.student_id_image_mime };
}

export interface AdminDashboardOverview {
  userStats: {
    totalUsers: number;
    activeRequesters: number;
    activeStaff: number;
    pendingApprovals: number;
    needsCorrectionAccounts: number;
  };
  requestStats: {
    total: number;
    pending: number;
    processing: number;
    needsCorrection: number;
    readyForRelease: number;
    released: number;
    rejected: number;
  };
  pendingStudents: AdminUserRecord[];
  recentUsers: AdminUserRecord[];
  recentAuditLogs: AdminAuditLogRecord[];
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const admin = createSupabaseAdminClient();

  const [usersResult, requestsRes, auditResult] = await Promise.all([
    listAdminUsers(),
    admin.from("document_requests").select("status"),
    listAdminAuditLogs({ limit: 8 }),
  ]);

  const users = usersResult.ok ? usersResult.users : [];
  const userStats = {
    totalUsers: users.length,
    activeRequesters: users.filter(
      (u) => u.role === "requester" && u.status === "approved"
    ).length,
    activeStaff: users.filter(
      (u) => u.role === "staff" && u.status === "active"
    ).length,
    pendingApprovals: users.filter(
      (u) => u.role === "requester" && u.status === "pending_approval"
    ).length,
    needsCorrectionAccounts: users.filter(
      (u) => u.role === "requester" && u.status === "needs_correction"
    ).length,
  };

  const reqRows = (requestsRes.data ?? []) as { status: string }[];
  const requestStats = {
    total: reqRows.length,
    pending: reqRows.filter((r) => r.status === "pending").length,
    processing: reqRows.filter((r) => r.status === "processing").length,
    needsCorrection: reqRows.filter((r) => r.status === "needs_correction")
      .length,
    readyForRelease: reqRows.filter((r) => r.status === "ready_for_release")
      .length,
    released: reqRows.filter((r) => r.status === "released").length,
    rejected: reqRows.filter((r) => r.status === "rejected").length,
  };

  return {
    userStats,
    requestStats,
    pendingStudents: users
      .filter((u) => u.role === "requester" && u.status === "pending_approval")
      .slice(0, 6),
    recentUsers: users.slice(0, 6),
    recentAuditLogs: auditResult.logs,
  };
}

export type AdminUserAction =
  | "approve_student"
  | "request_student_correction"
  | "reject_student"
  | "activate_account"
  | "deactivate_account";

export async function performAdminUserAction(input: {
  targetUserId: string;
  action: AdminUserAction;
  adminUser: SafeUser;
  remarks?: string;
}): Promise<
  | { ok: true; user: AdminUserRecord }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  let { data, error } = await admin
    .from("profiles")
    .select(FULL_PROFILE_SELECT)
    .eq("id", input.targetUserId)
    .maybeSingle();

  if (error && isMissingColumn(error.message)) {
    const fallback = await admin
      .from("profiles")
      .select(BASE_PROFILE_SELECT)
      .eq("id", input.targetUserId)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error || !data) {
    return { ok: false, status: 404, error: "User account not found." };
  }

  const target = mapAdminUserRow(data as unknown as RawAdminProfileRow);
  const remarks = input.remarks?.trim() || "";
  const now = new Date().toISOString();

  let nextStatus: AccountStatus;
  let auditAction: string;
  let entityType: "user" | "student_registration" | "staff_account" = "user";
  let description: string;

  if (input.action === "approve_student") {
    if (target.role !== "requester") {
      return {
        ok: false,
        status: 400,
        error: "Student approval only applies to Requester accounts.",
      };
    }
    if (!target.fullName || !target.email || !target.studentId) {
      return {
        ok: false,
        status: 400,
        error:
          "Cannot approve account: required student information (name, email, Student ID) is incomplete.",
      };
    }
    nextStatus = "approved";
    auditAction = "student_approved";
    entityType = "student_registration";
    description = `Approved student registration for ${target.fullName} (${target.studentId}).`;
  } else if (input.action === "request_student_correction") {
    if (target.role !== "requester") {
      return {
        ok: false,
        status: 400,
        error: "Correction requests only apply to Requester accounts.",
      };
    }
    if (!remarks) {
      return {
        ok: false,
        status: 400,
        error: "Please provide a clear correction explanation for the student.",
      };
    }
    nextStatus = "needs_correction";
    auditAction = "student_correction_requested";
    entityType = "student_registration";
    description = `Requested registration correction for ${target.fullName}: ${remarks}`;
  } else if (input.action === "reject_student") {
    if (target.role !== "requester") {
      return {
        ok: false,
        status: 400,
        error: "Registration rejection only applies to Requester accounts.",
      };
    }
    if (!remarks) {
      return {
        ok: false,
        status: 400,
        error: "Please provide a rejection reason before rejecting the account.",
      };
    }
    nextStatus = "rejected";
    auditAction = "student_rejected";
    entityType = "student_registration";
    description = `Rejected student registration for ${target.fullName}: ${remarks}`;
  } else if (input.action === "deactivate_account") {
    if (target.id === input.adminUser.id) {
      return {
        ok: false,
        status: 400,
        error: "You cannot deactivate your own active Admin account.",
      };
    }
    if (target.role === "admin" && target.status === "active") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "active");
      if ((count ?? 0) <= 1) {
        return {
          ok: false,
          status: 400,
          error: "Cannot deactivate the only active Admin account.",
        };
      }
    }
    nextStatus = "inactive";
    auditAction = "account_deactivated";
    entityType = target.role === "staff" ? "staff_account" : "user";
    description = `Deactivated ${target.role} account for ${target.fullName} (${target.email}).`;
  } else if (input.action === "activate_account") {
    nextStatus = target.role === "requester" ? "approved" : "active";
    auditAction = "account_activated";
    entityType = target.role === "staff" ? "staff_account" : "user";
    description = `Activated ${target.role} account for ${target.fullName} (${target.email}).`;
  } else {
    return { ok: false, status: 400, error: "Unsupported administrative action." };
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    approval_remarks:
      input.action === "approve_student" || input.action === "activate_account"
        ? null
        : remarks || target.approvalRemarks,
    reviewed_by_admin_id: input.adminUser.id,
    reviewed_at: now,
  };

  let { data: updated, error: updateError } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", target.id)
    .select(FULL_PROFILE_SELECT)
    .single();

  if (updateError && isMissingColumn(updateError.message)) {
    const fallback = await admin
      .from("profiles")
      .update({ status: nextStatus })
      .eq("id", target.id)
      .select(BASE_PROFILE_SELECT)
      .single();
    updated = fallback.data as typeof updated;
    updateError = fallback.error;
  }

  if (updateError || !updated) {
    return {
      ok: false,
      status: 500,
      error: "Unable to update the user account right now.",
    };
  }

  const updatedUser = mapAdminUserRow(updated as unknown as RawAdminProfileRow);

  await recordAdminAuditLog({
    actor: input.adminUser,
    action: auditAction,
    entityType,
    entityId: target.id,
    entityLabel: `${target.fullName} (${target.email})`,
    description,
    previousValue: { status: target.status },
    newValue: {
      status: nextStatus,
      ...(remarks ? { remarks } : {}),
    },
  });

  if (input.action === "approve_student") {
    await createNotification({
      recipientId: target.id,
      requestId: null,
      requestReference: null,
      category: "status_update",
      title: "Student Account Approved",
      message:
        "Your DNSC RegistrarDocs AI student account has been approved. You may now request academic documents.",
    });
  }

  return { ok: true, user: updatedUser };
}

export async function createStaffAccountByAdmin(input: {
  fullName: string;
  email: string;
  employeeId?: string;
  status?: "active" | "invitation_pending";
  loginUrl: string;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; user: AdminUserRecord; emailDelivery: EmailDeliveryResult }
  | { ok: false; status: number; error: string }
> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const employeeId = input.employeeId?.trim() || null;
  const status =
    input.status === "invitation_pending" ? "invitation_pending" : "active";

  if (!fullName || fullName.length < 2) {
    return { ok: false, status: 400, error: "Full name is required." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "A valid email address is required." };
  }

  const admin = createSupabaseAdminClient();

  // Check duplicate email in profiles
  const { data: existingEmail } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingEmail) {
    return {
      ok: false,
      status: 409,
      error: "An account with this email address already exists.",
    };
  }

  if (employeeId) {
    const { data: existingEmp } = await admin
      .from("profiles")
      .select("id")
      .ilike("employee_id", employeeId)
      .maybeSingle();
    if (existingEmp) {
      return {
        ok: false,
        status: 409,
        error: "An account with this Employee ID already exists.",
      };
    }
  }

  // Generate cryptographically secure temporary password on the server (never saved to DB)
  const temporaryPassword = generateSecureTemporaryPassword(14);

  const { data: createdAuth, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "staff" },
    });

  if (authError || !createdAuth.user) {
    const msg = authError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        ok: false,
        status: 409,
        error: "An authentication account with this email already exists.",
      };
    }
    return {
      ok: false,
      status: 500,
      error:
        authError?.message ||
        "Unable to provision Staff authentication account.",
    };
  }

  let { data: profileData, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: createdAuth.user.id,
      full_name: fullName,
      email,
      student_id: null,
      employee_id: employeeId,
      role: "staff",
      status,
      must_change_password: true,
    })
    .select(BASE_PROFILE_SELECT)
    .single();

  // Graceful fallback if migration 0006 has not been applied yet
  if (profileError && isMissingColumn(profileError.message)) {
    const fallback = await admin
      .from("profiles")
      .insert({
        id: createdAuth.user.id,
        full_name: fullName,
        email,
        student_id: null,
        employee_id: employeeId,
        role: "staff",
        status,
      })
      .select(BASE_PROFILE_SELECT)
      .single();
    profileData = fallback.data;
    profileError = fallback.error;
  }

  if (profileError || !profileData) {
    // Roll back Auth user so we never leave orphaned accounts
    await admin.auth.admin.deleteUser(createdAuth.user.id);
    return {
      ok: false,
      status: 500,
      error: "Unable to create Staff profile record.",
    };
  }

  const createdUser = mapAdminUserRow(
    profileData as unknown as RawAdminProfileRow
  );

  // Send branded onboarding email with temporary credentials
  const emailDelivery = await sendStaffOnboardingEmail({
    fullName: createdUser.fullName,
    email: createdUser.email,
    employeeId: createdUser.employeeId,
    temporaryPassword,
    loginUrl: input.loginUrl,
  });

  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "staff_account_created",
    entityType: "staff_account",
    entityId: createdUser.id,
    entityLabel: `${createdUser.fullName} (${createdUser.email})`,
    description: `Created Staff account for ${createdUser.fullName} (status: ${status}, onboarding email ${emailDelivery.sent ? "sent" : "not sent"}).`,
    previousValue: null,
    newValue: {
      email: createdUser.email,
      employeeId: createdUser.employeeId,
      role: "staff",
      status: createdUser.status,
      mustChangePassword: true,
      emailSent: emailDelivery.sent,
    },
  });

  return { ok: true, user: createdUser, emailDelivery };
}

/**
 * Generates a fresh cryptographically secure temporary password, updates the
 * eligible Staff member's Auth credentials, enforces `must_change_password = true`,
 * and resends the branded Staff onboarding email.
 */
export async function resendStaffOnboardingEmail(input: {
  staffUserId: string;
  loginUrl: string;
  adminUser: SafeUser;
}): Promise<
  | { ok: true; emailDelivery: EmailDeliveryResult }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(BASE_PROFILE_SELECT)
    .eq("id", input.staffUserId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, status: 404, error: "Staff account not found." };
  }

  const target = mapAdminUserRow(data as unknown as RawAdminProfileRow);
  if (target.role !== "staff") {
    return {
      ok: false,
      status: 400,
      error: "Onboarding emails can only be resent to Staff accounts.",
    };
  }
  if (target.status === "inactive") {
    return {
      ok: false,
      status: 400,
      error: "Activate this Staff account before resending onboarding credentials.",
    };
  }

  const temporaryPassword = generateSecureTemporaryPassword(14);
  const { error: updateAuthErr } = await admin.auth.admin.updateUserById(
    target.id,
    { password: temporaryPassword }
  );

  if (updateAuthErr) {
    return {
      ok: false,
      status: 500,
      error: "Unable to rotate temporary credentials right now.",
    };
  }

  await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", target.id);

  const emailDelivery = await sendStaffOnboardingEmail({
    fullName: target.fullName,
    email: target.email,
    employeeId: target.employeeId,
    temporaryPassword,
    loginUrl: input.loginUrl,
  });

  await recordAdminAuditLog({
    actor: input.adminUser,
    action: "staff_onboarding_email_resent",
    entityType: "staff_account",
    entityId: target.id,
    entityLabel: `${target.fullName} (${target.email})`,
    description: `Resent Staff onboarding credentials to ${target.email} (${emailDelivery.sent ? "delivered" : "delivery failed"}).`,
    newValue: { emailSent: emailDelivery.sent, mustChangePassword: true },
  });

  return { ok: true, emailDelivery };
}
