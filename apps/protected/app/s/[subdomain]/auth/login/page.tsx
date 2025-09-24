import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();

  // If we have a valid session cookie and it belongs to this tenant, skip login
  if (!error && claims && claims.claims.subdomain === subdomain) {
    redirect("/dashboard"); // Clean URL (middleware will rewrite internally)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to {subdomain}</p>
        </div>
        <LoginForm subdomain={subdomain} />
      </div>
    </div>
  );
}
