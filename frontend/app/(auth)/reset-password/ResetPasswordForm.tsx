"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";

export default function ResetPasswordForm() {
  const supabase = useSupabase();

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
        view="forgotten_password"
        showLinks={false}
        redirectTo={`${window.location.origin}/auth/callback`}
      />
      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-foreground hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
