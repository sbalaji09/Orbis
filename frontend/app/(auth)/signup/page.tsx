import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";
import Link from "next/link";
import { OrbisLogo } from "@/components/OrbisLogo";

export default async function SignupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <SignupForm />
    </div>
  );
}
