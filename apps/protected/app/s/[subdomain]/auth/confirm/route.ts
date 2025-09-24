import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const _next = searchParams.get("next");
  const next = _next?.startsWith("/") ? _next : "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // After verification, attempt to bootstrap organization (retry a few times if session not yet ready)
      try {
        let attempts = 0;
        // small retry loop to wait for session
        /* eslint-disable no-await-in-loop */
        while (attempts < 3) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            // Fire RPC to bootstrap org. It’s safe if org already exists (function will fail gracefully on duplicate)
            const { searchParams } = new URL(request.url);
            const orgName = searchParams.get("org_name");
            const userEmail = searchParams.get("email");
            const sub = subdomain;
            if (orgName && sub) {
              await supabase.rpc("bootstrap_organization", {
                p_org_name: orgName,
                p_subdomain: sub,
                p_user_email: userEmail,
              });
            }
            break;
          }
          attempts++;
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        // Non-fatal: bootstrap can be retried later from app UI
      }

      // Redirect back to login with success
      redirect(
        `/auth/login?verified=true&message=Email verified successfully! Please login with your details.`
      );
    } else {
      // Token expired or invalid - redirect to resend verification page
      if (
        error.message.includes("expired") ||
        error.message.includes("invalid")
      ) {
        redirect(
          `/auth/resend-verification?error=expired&message=Verification link has expired. Please request a new one.`
        );
      } else {
        // Other verification errors
        redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
      }
    }
  }

  // Missing token or type - redirect to resend verification
  redirect(
    `/auth/resend-verification?error=missing&message=Invalid verification link. Please request a new one.`
  );
}
