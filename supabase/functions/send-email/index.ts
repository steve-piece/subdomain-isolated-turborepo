// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { renderAsync } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { Resend } from "npm:resend@4.0.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

import { SignupConfirmationEmail } from "./_templates/signup-confirmation-email.tsx";
import { PasswordResetEmail } from "./_templates/password-reset-email.tsx";
import { UserInvitationEmail } from "./_templates/user-invitation-email.tsx";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is required for the send-email hook");
}

const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
if (!rawHookSecret) {
  throw new Error("SEND_EMAIL_HOOK_SECRET is required for the send-email hook");
}

const hookSecret = rawHookSecret.replace("v1,whsec_", "");
const resend = new Resend(resendApiKey);
const webhookVerifier = new Webhook(hookSecret);

const appDomain = Deno.env.get("NEXT_PUBLIC_APP_DOMAIN");
const marketingDomain = Deno.env.get("NEXT_PUBLIC_MARKETING_DOMAIN");
const supportEmail =
  Deno.env.get("SENDER_EMAIL") ??
  Deno.env.get("SUPPORT_EMAIL") ??
  "support@auth.voltguardai.com";

type EmailActionType =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "reauthenticate";

interface HookPayload {
  user: {
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: EmailActionType;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    data?: Record<string, unknown>;
  };
}

interface ResolvedEmail {
  subject: string;
  react?: React.ReactElement;
  text?: string;
}

function mapMetadata(
  metadata?: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

function buildTenantUrl(
  subdomain: string | undefined,
  path: string,
  fallback?: string
): string | undefined {
  if (fallback) return fallback;
  if (!subdomain || !appDomain) return undefined;
  return `https://${subdomain}.${appDomain}${path}`;
}

function buildConfirmationUrl(
  action: EmailActionType,
  tokenHash: string,
  redirectTo?: string,
  siteUrl?: string,
  subdomain?: string
): string | undefined {
  if (redirectTo) return redirectTo;

  const base =
    subdomain && appDomain
      ? `https://${subdomain}.${appDomain}`
      : (siteUrl ??
        (marketingDomain ? `https://${marketingDomain}` : undefined));

  if (!base) return undefined;

  const confirmationUrl = new URL(base);
  confirmationUrl.pathname = "/auth/confirm";
  confirmationUrl.searchParams.set("token_hash", tokenHash);
  confirmationUrl.searchParams.set("type", action);
  return confirmationUrl.toString();
}

function resolveEmail({ user, email_data }: HookPayload): ResolvedEmail {
  const metadata = mapMetadata(email_data.data);
  const userMetadata = mapMetadata(
    user.user_metadata as Record<string, unknown> | undefined
  );

  const subdomain = metadata.subdomain ?? userMetadata.subdomain;
  const organizationName =
    metadata.organization_name ??
    userMetadata.company_name ??
    "Your Organization";
  const inviterName =
    metadata.invited_by_name ??
    metadata.invited_by_email ??
    userMetadata.full_name;
  const inviterEmail =
    metadata.invited_by_email ?? userMetadata.email ?? user.email;
  const userRole = metadata.user_role ?? "member";
  const fullName = userMetadata.full_name ?? metadata.full_name;

  switch (email_data.email_action_type) {
    case "signup": {
      const confirmationUrl =
        buildConfirmationUrl(
          email_data.email_action_type,
          email_data.token_hash,
          email_data.redirect_to,
          email_data.site_url,
          subdomain
        ) ?? "";

      return {
        subject: `Confirm your email for ${organizationName}`,
        react: React.createElement(SignupConfirmationEmail, {
          userName: fullName ?? user.email,
          organizationName,
          confirmationUrl,
          subdomain: subdomain ?? "",
        }),
      };
    }

    case "recovery": {
      const resetUrl =
        buildTenantUrl(
          subdomain,
          `/auth/update-password?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}`,
          email_data.redirect_to
        ) ?? "";

      return {
        subject: `Reset your password for ${organizationName}`,
        react: React.createElement(PasswordResetEmail, {
          userName: fullName,
          organizationName,
          resetUrl,
        }),
      };
    }

    case "invite": {
      const invitationUrl =
        buildTenantUrl(
          subdomain,
          `/auth/accept-invitation?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}`,
          email_data.redirect_to
        ) ?? "";

      return {
        subject: `You're invited to join ${organizationName}`,
        react: React.createElement(UserInvitationEmail, {
          organizationName,
          inviterName: inviterName ?? inviterEmail ?? organizationName,
          inviterEmail: inviterEmail ?? "",
          invitationUrl,
          userRole,
          recipientEmail: user.email,
        }),
      };
    }

    case "magiclink": {
      return {
        subject: "Your magic link",
        text: `Use this link to sign in: ${
          buildTenantUrl(
            subdomain,
            `/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}`,
            email_data.redirect_to
          ) ?? email_data.token
        }`,
      };
    }

    case "email_change": {
      const redirect = buildTenantUrl(
        subdomain,
        `/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}`,
        email_data.redirect_to
      );
      return {
        subject: "Confirm your email change",
        text: `Confirm your new email by visiting: ${redirect ?? email_data.token}`,
      };
    }

    case "reauthenticate": {
      return {
        subject: "Confirm your identity",
        text: `Enter this code to confirm your identity: ${email_data.token}`,
      };
    }

    default:
      return {
        subject: "Supabase Auth notification",
        text: `Your code is: ${email_data.token}`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const event = webhookVerifier.verify(payload, headers) as HookPayload;

    const resolvedEmail = resolveEmail(event);

    let html: string | undefined;
    if (resolvedEmail.react) {
      html = await renderAsync(resolvedEmail.react);
    }

    const sendResult = await resend.emails.send({
      from: supportEmail,
      to: [event.user.email],
      subject: resolvedEmail.subject,
      html,
      text: resolvedEmail.text,
    });

    if (sendResult.error) {
      throw sendResult.error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email hook error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
