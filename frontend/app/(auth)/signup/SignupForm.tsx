"use client";

import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";
import { useState } from "react";
import { OrbisLogo } from "@/components/OrbisLogo";

export default function SignupForm() {
  const supabase = useSupabase();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailSignup = async (e: React.FormEvent) => {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage("Check your email to confirm your account!");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: "google" | "github" | "azure") => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Left Column - Branding & OAuth */}
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
            <span className="text-black/40">{`> `}</span>Create account
          </h1>
          <p className="text-sm text-black/60">
            {`// Start observing your AI agents`}
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

        {/* OAuth Providers */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => handleOAuthSignup("google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm tracking-tight">
              sign_up_with_google()
            </span>
          </button>

          <button
            onClick={() => handleOAuthSignup("github")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm tracking-tight">
              sign_up_with_github()
            </span>
          </button>

          <button
            onClick={() => handleOAuthSignup("azure")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-black hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23">
              <path fill="#f25022" d="M0 0h11v11H0z" />
              <path fill="#00a4ef" d="M12 0h11v11H12z" />
              <path fill="#7fba00" d="M0 12h11v11H0z" />
              <path fill="#ffb900" d="M12 12h11v11H12z" />
            </svg>
            <span className="text-sm tracking-tight">
              sign_up_with_microsoft()
            </span>
          </button>
        </div>

        <p className="text-xs text-black/60">
          <span className="text-black/40">{`// `}</span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-babyblue font-semibold hover:underline"
          >
            login()
          </Link>
        </p>
      </div>

      {/* Right Column - Email/Password Form */}
      <div className="bg-background flex flex-col justify-center px-12 lg:px-16 py-12">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-sm text-black/60 tracking-wide uppercase mb-6">
              {`// Or sign up with email`}
            </h2>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-5">
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

            <div>
              <label
                htmlFor="password"
                className="block text-xs text-black/60 mb-2 tracking-wide uppercase"
              >
                {`// password`}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none focus:border-babyblue transition-colors"
                placeholder="••••••••"
                disabled={loading}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none focus:border-babyblue transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-black text-mustard border-2 border-black hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
            >
              {loading ? "creating_account..." : "sign_up()"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
