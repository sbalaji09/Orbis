import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's JWT access token for API authentication (server-side)
 * Returns null if no session exists
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Get authorization headers for API requests (server-side)
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
