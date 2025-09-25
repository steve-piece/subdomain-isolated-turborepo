import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { confirmEmailAndBootstrap } from "../../../../actions";

interface ConfirmPageProps {
  params: { subdomain: string };
  searchParams: {
    token_hash?: string;
    type?: string;
    next?: string;
    email?: string;
  };
}

export default async function ConfirmPage({
  params,
  searchParams,
}: ConfirmPageProps) {
  const { subdomain } = params;
  const token_hash = searchParams?.token_hash || null;
  const type = (searchParams?.type as EmailOtpType | undefined) || undefined;

  if (!token_hash || !type) {
    redirect(
      "/auth/resend-verification?error=missing&message=Invalid verification link. Please request a new one."
    );
  }

  const result = await confirmEmailAndBootstrap(
    token_hash,
    type as EmailOtpType,
    subdomain
  );

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  redirect("/auth/login");
}
