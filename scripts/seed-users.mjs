/**
 * Development-only Supabase User Seed script (idempotent).
 * Seeds one ready-to-use account for each role:
 *   1. Admin:     Admin@local.test   / AdminPass123   (role=admin,     status=active)
 *   2. Staff:     staff@local.test   / StaffPass123   (role=staff,     status=active)
 *   3. Requester: student@local.test / StudentPass123 (role=requester, status=approved)
 *
 * Usage:
 *   npm run seed:users
 *
 * WARNING:
 *   These credentials are strictly for local development and testing.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run development user seed when NODE_ENV=production.");
  process.exit(1);
}

for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SEED_USERS = [
  {
    label: "Admin",
    email: (process.env.DEV_ADMIN_EMAIL || "Admin@local.test").trim(),
    password: process.env.DEV_ADMIN_PASSWORD || "AdminPass123",
    fullName: (process.env.DEV_ADMIN_NAME || "Development Administrator").trim(),
    role: "admin",
    status: "active",
    studentId: null,
    employeeId: "ADM-2026-001",
  },
  {
    label: "Staff",
    email: (process.env.DEV_STAFF_EMAIL || "staff@local.test").trim(),
    password: process.env.DEV_STAFF_PASSWORD || "StaffPass123",
    fullName: (process.env.DEV_STAFF_NAME || "Registrar Staff Tester").trim(),
    role: "staff",
    status: "active",
    studentId: null,
    employeeId: "EMP-2026-001",
  },
  {
    label: "Requester",
    email: (process.env.DEV_REQUESTER_EMAIL || "student@local.test").trim(),
    password: process.env.DEV_REQUESTER_PASSWORD || "StudentPass123",
    fullName: (process.env.DEV_REQUESTER_NAME || "Juan Dela Cruz").trim(),
    role: "requester",
    status: "approved",
    studentId: "2026-00001",
    employeeId: null,
  },
];

async function ensureUser(seed, existingAuthUsers) {
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, email, role, status, student_id, employee_id")
    .ilike("email", seed.email)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Profile lookup failed for ${seed.email}: ${lookupError.message}`);
  }

  if (existingProfile) {
    console.log(
      `[SKIP] ${seed.label} already exists: ${existingProfile.email} (role=${existingProfile.role}, status=${existingProfile.status})`
    );
    return;
  }

  const existingAuth = existingAuthUsers.find(
    (u) => u.email?.toLowerCase() === seed.email.toLowerCase()
  );

  let authUserId = existingAuth?.id ?? null;

  if (!authUserId) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
          role: seed.role,
        },
      });

    if (createError || !created.user) {
      throw new Error(
        `Failed to create Auth user ${seed.email}: ${createError?.message || "Unknown error"}`
      );
    }
    authUserId = created.user.id;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: authUserId,
    full_name: seed.fullName,
    email: seed.email,
    student_id: seed.studentId,
    employee_id: seed.employeeId,
    role: seed.role,
    status: seed.status,
  });

  if (insertError) {
    throw new Error(
      `Failed to insert profile for ${seed.email}: ${insertError.message}`
    );
  }

  console.log(
    `[CREATED] ${seed.label}: ${seed.email} / ${seed.password} (role=${seed.role}, status=${seed.status})`
  );
}

async function main() {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("Failed to list Supabase Auth users:", listError.message);
    process.exit(1);
  }

  for (const seed of SEED_USERS) {
    await ensureUser(seed, listData.users);
  }
}

main().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});
