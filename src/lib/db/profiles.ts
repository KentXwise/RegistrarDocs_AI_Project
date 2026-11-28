import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  findDnscInstitute,
  isValidInstituteProgramPair,
} from "@/lib/dnsc/academic-programs";
import type { AccountStatus, SafeUser, UserRole } from "@/types/auth";

export interface ProfileRow {
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
  must_change_password?: boolean | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export function toSafeUser(row: ProfileRow): SafeUser {
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
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}

export async function findProfileByEmail(
  email: string
): Promise<ProfileRow | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .ilike("email", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}

export async function findProfileByStudentId(
  studentId: string
): Promise<ProfileRow | null> {
  const trimmed = studentId.trim();
  if (!trimmed) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .ilike("student_id", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}

/**
 * Server-only lookup resolving either an email address or a Student ID
 * to the associated profile record before authenticating with Supabase Auth.
 * Never exposed through any public lookup endpoint.
 */
export async function resolveProfileByLoginIdentifier(
  identifier: string
): Promise<ProfileRow | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return findProfileByEmail(trimmed);
  }

  const byStudentId = await findProfileByStudentId(trimmed);
  if (byStudentId) return byStudentId;

  return findProfileByEmail(trimmed);
}

export interface CreateRequesterProfileInput {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  studentIdImagePath: string;
  studentIdImageMime: string;
  studentIdImageSize: number;
}

/**
 * Inserts a requester profile linked to a Supabase Auth user ID.
 * Role ('requester') and status ('pending_approval') are enforced server-side.
 */
export async function createRequesterProfile(
  input: CreateRequesterProfileInput
): Promise<SafeUser> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: input.id,
      full_name: input.fullName.trim(),
      email: input.email.trim(),
      student_id: input.studentId.trim(),
      employee_id: null,
      role: "requester",
      status: "pending_approval",
      student_id_image_path: input.studentIdImagePath,
      student_id_image_mime: input.studentIdImageMime,
      student_id_image_size: input.studentIdImageSize,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create requester profile.");
  }

  return toSafeUser(data as ProfileRow);
}

export interface CreateStaffProfileInput {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string | null;
  status?: "invitation_pending" | "active";
}

/**
 * Backend foundation helper for Staff profiles (not exposed publicly).
 * Reserved for future Admin User Management milestone.
 */
export async function createStaffProfile(
  input: CreateStaffProfileInput
): Promise<SafeUser> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: input.id,
      full_name: input.fullName.trim(),
      email: input.email.trim(),
      student_id: null,
      employee_id: input.employeeId?.trim() || null,
      role: "staff",
      status: input.status ?? "invitation_pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create staff profile.");
  }

  return toSafeUser(data as ProfileRow);
}

export async function updateProfileLastLogin(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function updateRequesterAcademicProfile(
  userId: string,
  institute: string,
  program: string
): Promise<
  | { ok: true; user: SafeUser }
  | {
      ok: false;
      error: string;
      status: number;
      fieldErrors?: Record<string, string>;
    }
> {
  const trimmedInstitute = institute.trim();
  const trimmedProgram = program.trim();
  const fieldErrors: Record<string, string> = {};

  if (!trimmedInstitute) {
    fieldErrors.institute = "Please select your DNSC Institute.";
  } else if (!findDnscInstitute(trimmedInstitute)) {
    fieldErrors.institute =
      "Selected Institute is not a valid DNSC Institute.";
  }

  if (!trimmedProgram) {
    fieldErrors.program = "Please select your academic Program.";
  } else if (
    trimmedInstitute &&
    findDnscInstitute(trimmedInstitute) &&
    !isValidInstituteProgramPair(trimmedInstitute, trimmedProgram)
  ) {
    fieldErrors.program =
      "Selected Program does not belong to the chosen DNSC Institute.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please select a valid DNSC Institute and matching Program.",
      status: 400,
      fieldErrors,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      institute: trimmedInstitute,
      program: trimmedProgram,
    })
    .eq("id", userId)
    .eq("role", "requester")
    .select("*")
    .single();

  if (error || !data) {
    const msg = (error?.message ?? "").toLowerCase();
    if (
      msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("schema cache")
    ) {
      return {
        ok: false,
        error:
          "Academic profile columns are not yet created in Supabase. Please run migration 0009_requester_academic_profile.sql.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: error?.message || "Unable to save academic profile right now.",
      status: 500,
    };
  }

  return { ok: true, user: toSafeUser(data as ProfileRow) };
}
