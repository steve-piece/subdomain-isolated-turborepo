import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { confirmEmail } from "./actions";

interface ConfirmPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfirmPage({
  params,
  searchParams,
}: ConfirmPageProps) {
  const { subdomain } = await params;
  const search = await searchParams;

  const token_hash =
    typeof search.token_hash === "string" ? search.token_hash : null;
  const type =
    typeof search.type === "string" ? (search.type as EmailOtpType) : null;

  if (token_hash && type) {
    const result = await confirmEmail(token_hash, type, subdomain);

    if (result.redirectTo) {
      redirect(
        result.redirectTo +
          (result.message
            ? `&message=${encodeURIComponent(result.message)}`
            : "")
      );
    }
  }

  // Missing token or type - redirect to resend verification
  redirect(
    `/auth/resend-verification?error=missing&message=Invalid verification link. Please request a new one.`
  );
}
