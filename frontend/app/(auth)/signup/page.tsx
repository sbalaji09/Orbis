import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted">Sign up to get started with Orbis</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
