/**
 * Development-only Supabase Admin bootstrap script (idempotent).
 *
 * Usage:
 *   npm run seed:admin
 *
 * Prerequisites:
 *   1. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. Run supabase/migrations/0001_profiles_rbac_storage.sql in your Supabase project
 *
 * WARNING:
 *   Default credentials (Admin@local.test / AdminPass123) are strictly for
 *   local development and MUST NOT be used in production.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run development Admin bootstrap when NODE_ENV=production."
  );
  process.exit(1);
}

// Load .env.local / .env automatically in Node.js 24 if present
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
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Configure .env.local before running `npm run seed:admin`."
  );
  process.exit(1);
}

const adminEmail = (process.env.DEV_ADMIN_EMAIL || "Admin@local.test").trim();
const adminPassword = process.env.DEV_ADMIN_PASSWORD || "AdminPass123";
const adminFullName = (
  process.env.DEV_ADMIN_NAME || "Development Administrator"
).trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // 1. Check if profile already exists (idempotent; never overwrite existing password)
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, email, role, status")
    .ilike("email", adminEmail)
    .maybeSingle();

  if (profileLookupError) {
    console.error(
      "Failed to query public.profiles. Ensure migration 0001_profiles_rbac_storage.sql has been applied."
    );
    console.error(profileLookupError.message);
    process.exit(1);
  }

  if (existingProfile) {
    console.log(
      `Development Admin account already exists (${existingProfile.email}, role=${existingProfile.role}, status=${existingProfile.status}). No changes made.`
    );
    return;
  }

  // 2. Check if Auth user already exists without a profile row
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    console.error("Failed to check Supabase Auth users:", listError.message);
    process.exit(1);
  }

  const existingAuthUser = listData.users.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  let authUserId = existingAuthUser?.id ?? null;

  if (!authUserId) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName,
        },
      });

    if (createError || !created.user) {
      console.error(
        "Failed to create development Admin in Supabase Auth:",
        createError?.message || "Unknown error"
      );
      process.exit(1);
    }

    authUserId = created.user.id;
  } else {
    console.log(
      `Found existing Supabase Auth user for ${adminEmail}; preserving existing password and linking admin profile.`
    );
  }

  // 3. Insert linked admin profile with explicit role='admin' and status='active'
  const { error: insertError } = await supabase.from("profiles").insert({
    id: authUserId,
    full_name: adminFullName,
    email: adminEmail,
    student_id: null,
    employee_id: null,
    role: "admin",
    status: "active",
  });

  if (insertError) {
    console.error("Failed to create admin profile:", insertError.message);
    process.exit(1);
  }

  console.log(
    `Created development Admin account: ${adminEmail} (role=admin, status=active).`
  );
  console.log(
    "WARNING: Change development Admin credentials before any production deployment."
  );
}

main().catch((err) => {
  console.error("Unexpected error during Admin bootstrap:", err.message);
  process.exit(1);
});
