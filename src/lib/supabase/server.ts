import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabaseAdminConfig,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

export class SupabaseConfigError extends Error {
  constructor() {
    super(
      "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    );
    this.name = "SupabaseConfigError";
  }
}

/**
 * Creates a cookie-backed SSR Supabase client for user-scoped auth sessions
 * (login, logout, session verification). Uses only public URL + anon key.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new SupabaseConfigError();
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: options?.sameSite ?? "lax",
            });
          });
        } catch {
          // Called from a Server Component where setting cookies is not permitted.
          // Session cookies are set/cleared by Route Handlers.
        }
      },
    },
  });
}

/**
 * Creates a server-only Supabase admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively on the Node.js server for:
 * - Server-side Student ID -> email resolution during login
 * - Creating requester profiles and uploading private Student ID images
 * - Fetching authoritative role & status for RBAC enforcement
 *
 * NEVER import or call this from client components.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new SupabaseConfigError();
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
