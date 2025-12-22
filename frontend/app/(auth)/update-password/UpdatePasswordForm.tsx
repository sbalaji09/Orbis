"use client";

import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OrbisLogo } from "@/components/OrbisLogo";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UpdatePasswordForm() {
  const supabase = useSupabase();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setHasSession(false);
          return;
        }
        if (!data.session) {
          setError("Reset link is invalid or expired. Request a new one.");
          setHasSession(false);
        } else {
          setHasSession(true);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated! Redirecting...");
    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  };

  const inputsDisabled = loading || checking || !hasSession;

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Left Column - Branding */}
      <div className="bg-white border-r-2 border-black flex flex-col justify-center px-12 lg:px-16 py-12">
        <Link
          href="/"
          className="flex items-center gap-3 mb-12 hover:opacity-70 transition-opacity"
        >
          <OrbisLogo className="w-10 h-10" />
          <span className="text-xl tracking-tight font-semibold">orbis</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl tracking-tight mb-3">
            <span className="text-black/40">{`> `}</span>Set new password
          </h1>
          <p className="text-sm text-black/60">
            {`// Choose a new password for your account`}
          </p>
        </div>

        <p className="text-xs text-black/60">
          <span className="text-black/40">{`// `}</span>
          If this link expired, request a new one from{" "}
          <Link href="/reset-password" className="text-babyblue font-semibold hover:underline">
            reset_password()
          </Link>
          .
        </p>
      </div>

      {/* Right Column - Update Password Form */}
      <div className="bg-background flex flex-col justify-center px-12 lg:px-16 py-12">
        <div className="max-w-md mx-auto w-full">
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

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-xs text-black/60 mb-2 tracking-wide uppercase"
              >
                {`// new_password`}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none focus:border-babyblue transition-colors"
                placeholder="••••••••"
                disabled={inputsDisabled}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs text-black/60 mb-2 tracking-wide uppercase"
              >
                {`// confirm_password`}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                className="w-full px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none focus:border-babyblue transition-colors"
                placeholder="••••••••"
                disabled={inputsDisabled}
              />
            </div>

            <button
              type="submit"
              disabled={inputsDisabled}
              className="w-full px-4 py-3 bg-black text-mustard border-2 border-black hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
            >
              {checking ? "checking..." : loading ? "updating..." : "update_password()"}
            </button>
          </form>

          <div className="mt-6 text-center">
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
