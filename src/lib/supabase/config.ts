export const STUDENT_ID_STORAGE_BUCKET =
  process.env.SUPABASE_STUDENT_ID_BUCKET?.trim() || "student-ids";

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseAdminConfig extends SupabasePublicConfig {
  serviceRoleKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const pub = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!pub || !serviceRoleKey) {
    return null;
  }

  return {
    ...pub,
    serviceRoleKey,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseAdminConfig() !== null;
}
