// apps/protected/app/s/[subdomain]/auth/confirm/page.tsx
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { confirmEmailAndBootstrap } from "../../../../actions";

interface ConfirmPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ConfirmPage({
  params,
  searchParams,
}: ConfirmPageProps) {
  const { subdomain } = await params;
  const query = await searchParams;

  const tokenHash =
    typeof query.token_hash === "string" ? query.token_hash : null;
  const type = query.type as EmailOtpType | undefined;

  if (!tokenHash || !type) {
    redirect(
      "/auth/resend-verification?error=missing&message=Invalid verification link. Please request a new one."
    );
  }

  const result = await confirmEmailAndBootstrap(tokenHash, type, subdomain);

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  redirect("/auth/login");
}
