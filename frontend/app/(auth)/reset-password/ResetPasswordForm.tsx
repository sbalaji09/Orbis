"use client";

import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";
import { useState } from "react";
import { OrbisLogo } from "@/components/OrbisLogo";
import { ArrowLeft } from "lucide-react";

export default function ResetPasswordForm() {
  const supabase = useSupabase();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage("Check your email for the password reset link!");
      setEmail("");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="flex items-center justify-center gap-3 mb-12 hover:opacity-70 transition-opacity"
        >
          <OrbisLogo className="w-10 h-10" />
          <span className="text-xl tracking-tight font-semibold">orbis</span>
        </Link>

        <div className="bg-white border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.2)] p-10">
          <div className="mb-8">
            <h1 className="text-3xl tracking-tight mb-3">
              <span className="text-black/40">{`> `}</span>Reset password
            </h1>
            <p className="text-sm text-black/60">
              {`// Enter your email to receive a reset link`}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border-2 border-error text-error text-sm">
              <span className="text-xs tracking-wider uppercase">{`// ERROR`}</span>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-success/10 border-2 border-success text-success text-sm">
              <span className="text-xs tracking-wider uppercase">{`// SUCCESS`}</span>
              <p className="mt-1">{message}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs text-black/60 mb-2 tracking-wide uppercase"
              >
                {`// email`}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none focus:border-babyblue transition-colors"
                placeholder="user@example.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-black text-mustard border-2 border-black hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
            >
              {loading ? "sending..." : "send_reset_link()"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-black/10 text-center">
            <Link
              href="/login"
              className="text-sm text-black/60 hover:text-babyblue transition-colors inline-flex items-center gap-2 justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              back_to_login()
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
