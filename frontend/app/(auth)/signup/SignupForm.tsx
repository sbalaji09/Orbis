"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";

export default function SignupForm() {
  const supabase = useSupabase();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.2)] p-8">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#000000",
                brandAccent: "#333333",
              },
            },
          },
        }}
        theme="light"
        providers={[]}
        view="sign_up"
        showLinks={false}
        redirectTo={`${origin}/auth/callback`}
      />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
