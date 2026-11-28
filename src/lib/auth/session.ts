import { findProfileById, toSafeUser } from "@/lib/db/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAccountEligibleForAccess, type SafeUser } from "@/types/auth";

/**
 * Verifies the current Supabase Auth session cookie on the server, loads the
 * authoritative profile from `public.profiles`, and enforces account status.
 *
 * Returns null if unauthenticated, Supabase is not yet configured, or the
 * account is no longer eligible for access.
 */
export async function getAuthenticatedUser(): Promise<SafeUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const profile = await findProfileById(user.id);
    if (!profile) {
      return null;
    }

    if (!isAccountEligibleForAccess(profile.role, profile.status)) {
      await supabase.auth.signOut().catch(() => {});
      return null;
    }

    return toSafeUser(profile);
  } catch {
    return null;
  }
}

export async function revokeCurrentSession(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore sign-out errors if no valid session exists
  }
}
