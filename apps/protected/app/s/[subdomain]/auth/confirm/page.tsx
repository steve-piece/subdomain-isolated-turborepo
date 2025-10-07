// apps/protected/app/s/[subdomain]/auth/confirm/page.tsx
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  confirmEmailAndBootstrap,
  handleAuthConfirmation,
} from "../../../../actions";
import { MagicLinkVerify } from "@/components/auth/magic-link-verify";

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
  const typeValue = type as string | undefined;

  if (!tokenHash || !type) {
    redirect(
      "/auth/resend-verification?error=missing&message=Invalid verification link. Please request a new one.",
    );
  }

  // Handle types that need client-side verification (to establish session cookies)
  // These redirect to protected routes so session must be established client-side
  if (typeValue === "magiclink" || typeValue === "reauthenticate") {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <MagicLinkVerify type={typeValue as "magiclink" | "reauthenticate"} />
        </div>
      </div>
    );
  }

  // Signup needs special bootstrap handling
  if (type === "signup") {
    const result = await confirmEmailAndBootstrap(tokenHash, type, subdomain);

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect("/auth/login");
  }

  // Other types (email_change_*, etc.) can use server-side verification
  // as they don't redirect to protected routes
  let redirectHint: string | undefined;
  if (typeof query.redirect_to === "string") {
    try {
      redirectHint = decodeURIComponent(query.redirect_to);
    } catch {
      redirectHint = undefined;
    }
  } else {
    redirectHint = undefined;
  }

  const result = await handleAuthConfirmation(
    tokenHash,
    type,
    subdomain,
    redirectHint,
  );

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  redirect("/auth/login");
}
