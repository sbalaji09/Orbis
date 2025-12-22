"use client";

import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Ensure navigation matches auth state for client-side flows
        if (event === "SIGNED_IN") {
          if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
            router.replace("/dashboard");
            router.refresh();
          }
        }

        if (event === "SIGNED_OUT") {
          if (pathname !== "/login") {
            router.replace("/login");
            router.refresh();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return {
    user,
    session,
    loading,
    signOut,
    supabase,
  };
}
