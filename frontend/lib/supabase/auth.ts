import { createClient } from "@/lib/supabase/client";

/**
 * Get the current user's JWT access token for API authentication
 * Returns null if no session exists
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Get authorization headers for API requests
 * Returns empty object if no token available
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
