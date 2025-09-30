// supabase/functions/send-email/index.ts
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { renderAsync } from "@react-email/components";
import * as React from "react";
import { Resend } from "resend";
import { Webhook } from "standardwebhooks";

import { SignupConfirmationEmail } from "./_templates/signup-confirmation-email.tsx";
import { PasswordResetEmail } from "./_templates/password-reset-email.tsx";
import { UserInvitationEmail } from "./_templates/user-invitation-email.tsx";
import { NotificationEmail } from "./_templates/notification-email.tsx";
import { MagicLinkEmail } from "./_templates/magic-link-email.tsx";
import { TwoFactorEmail } from "./_templates/two-factor-email.tsx";

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

// Email toggle settings for testing
const enableInvitations =
  Deno.env.get("RESEND_ENABLE_INVITATION_EMAILS") !== "false";
const enableWelcome = Deno.env.get("RESEND_ENABLE_WELCOME_EMAILS") !== "false";
const enableVerify = Deno.env.get("RESEND_VERIFY_EMAILS") !== "false";

type EmailActionType =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "reauthenticate";

type NormalizedMetadata = {
  subdomain?: string;
  organization_name?: string;
  company_name?: string;
  invited_by_name?: string;
  invited_by_email?: string;
  user_role?: string;
  full_name?: string;
  email?: string;
  [key: string]: string | undefined;
};

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

function mapMetadata(metadata?: Record<string, unknown>): NormalizedMetadata {
  const result: NormalizedMetadata = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

const isDev = Deno.env.get("IS_DEV") === "true";
const devBaseUrl = "http://localhost:3003";

function composeTenantUrl(
  subdomain: string | undefined,
  path: string,
  options: {
    redirectTo?: string;
    siteUrl?: string;
    query?: Record<string, string | undefined>;
    hash?: Record<string, string | undefined>;
    preserveExistingPath?: boolean;
  } = {}
): string | undefined {
  const { redirectTo, siteUrl, query, hash, preserveExistingPath } = options;

  const baseCandidates: string[] = [];

  // Prefer localhost redirectTo for dev
  if (redirectTo) {
    try {
      const u = new URL(redirectTo);
      if (u.hostname === "localhost" || u.host.includes("localhost")) {
        baseCandidates.push(redirectTo);
      }
    } catch {}
  }

  // Fallback to dev base if no local redirectTo and in dev mode
  if (!baseCandidates.length && isDev) {
    baseCandidates.push(devBaseUrl);
  }

  // Normal prod base
  if (!baseCandidates.length && subdomain && appDomain) {
    baseCandidates.push(`https://${subdomain}.${appDomain}`);
  }

  if (!baseCandidates.length && siteUrl) {
    baseCandidates.push(siteUrl);
  }

  if (!baseCandidates.length && marketingDomain) {
    baseCandidates.push(`https://${marketingDomain}`);
  }

  let url: URL | undefined;
  for (const candidate of baseCandidates) {
    try {
      url = new URL(candidate);
      break;
    } catch (error) {
      console.warn(
        "send-email hook: unable to parse base candidate",
        JSON.stringify({
          candidate,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      continue;
    }
  }

  if (!url) {
    return redirectTo;
  }

  const shouldOverridePath = !preserveExistingPath;
  if (shouldOverridePath) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    url.pathname = normalizedPath;
    url.search = "";
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string" && value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }

  if (hash) {
    const hashParams = new URLSearchParams();
    for (const [key, value] of Object.entries(hash)) {
      if (typeof value === "string" && value.length > 0) {
        hashParams.set(key, value);
      }
    }
    const serializedHash = hashParams.toString();
    if (serializedHash.length > 0) {
      url.hash = "#" + serializedHash;
    }
  }

  return url.toString();
}

const AuthPaths: Record<
  EmailActionType | "recovery-complete" | "invite-accept",
  string
> = {
  signup: "/auth/confirm",
  recovery: "/auth/update-password",
  magiclink: "/auth/confirm",
  invite: "/auth/accept-invitation",
  email_change: "/auth/confirm",
  reauthenticate: "/auth/reauthenticate",
  "recovery-complete": "/auth/update-password/complete",
  "invite-accept": "/auth/accept-invitation/complete",
};

function buildAuthUrl(
  subdomain: string | undefined,
  pathKey: keyof typeof AuthPaths,
  options: {
    redirectTo?: string;
    siteUrl?: string;
    query?: Record<string, string | undefined>;
    hash?: Record<string, string | undefined>;
    preserveExistingPath?: boolean;
  } = {}
): string | undefined {
  const path = AuthPaths[pathKey];
  return composeTenantUrl(subdomain, path, {
    redirectTo: options.redirectTo,
    siteUrl: options.siteUrl,
    query: options.query,
    hash: options.hash,
    preserveExistingPath: options.preserveExistingPath,
  });
}

function buildConfirmationUrl(
  action: EmailActionType,
  tokenHash: string,
  redirectTo?: string,
  siteUrl?: string,
  subdomain?: string
): string | undefined {
  return buildAuthUrl(subdomain, action, {
    redirectTo,
    siteUrl,
    query: {
      token_hash: tokenHash,
      type: action,
    },
  });
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
        buildAuthUrl(subdomain, "recovery", {
          redirectTo: email_data.redirect_to,
          siteUrl: email_data.site_url,
          query: {
            // ✅ Put tokens in query params
            token_hash: email_data.token_hash,
            type: email_data.email_action_type,
            access_token: email_data.token,
            refresh_token: email_data.token_new ?? email_data.token_hash,
          },
          // Remove the hash section entirely
        }) ?? "";

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
        buildAuthUrl(subdomain, "invite", {
          redirectTo: email_data.redirect_to,
          siteUrl: email_data.site_url,
          query: {
            token_hash: email_data.token_hash,
            type: email_data.email_action_type,
          },
        }) ?? "";

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
      const magicLinkUrl =
        buildConfirmationUrl(
          email_data.email_action_type,
          email_data.token_hash,
          email_data.redirect_to,
          email_data.site_url,
          subdomain
        ) ?? email_data.token;

      return {
        subject: organizationName
          ? `Sign in to ${organizationName}`
          : "Your magic link to sign in",
        react: React.createElement(MagicLinkEmail, {
          userName: fullName,
          magicLinkUrl,
          organizationName,
          subdomain,
        }),
      };
    }

    case "email_change": {
      const redirect = buildConfirmationUrl(
        email_data.email_action_type,
        email_data.token_hash,
        email_data.redirect_to,
        email_data.site_url,
        subdomain
      );
      return {
        subject: "Confirm your email change",
        text: `Confirm your new email by visiting: ${redirect ?? email_data.token}`,
      };
    }

    case "reauthenticate": {
      const reauthUrl =
        buildAuthUrl(subdomain, "reauthenticate", {
          redirectTo: email_data.redirect_to,
          siteUrl: email_data.site_url,
          query: {
            action: "sensitive_action",
          },
        }) ?? "";

      return {
        subject: `Confirm your identity for ${organizationName}`,
        react: React.createElement(NotificationEmail, {
          userName: fullName,
          organizationName,
          notificationTitle: "Confirm your identity",
          notificationMessage: `We need to verify your identity to continue. Use this code: ${email_data.token}`,
          actionUrl: reauthUrl,
          actionText: "Verify identity",
        }),
      };
    }

    default:
      return {
        subject: "Supabase Auth notification",
        text: `Your code is: ${email_data.token}`,
      };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const event = webhookVerifier.verify(payload, headers) as HookPayload;

    console.info(
      "send-email hook: verified payload",
      JSON.stringify({
        emailActionType: event.email_data.email_action_type,
        userEmail: event.user.email,
        redirectTo: event.email_data.redirect_to,
        siteUrl: event.email_data.site_url,
        metadata: event.email_data.data,
      })
    );

    const resolvedEmail = resolveEmail(event);

    // Check email type toggles for testing
    const emailType = event.email_data.email_action_type;
    if (
      (emailType === "invite" && !enableInvitations) ||
      (emailType === "signup" && !enableVerify) ||
      ((emailType === "recovery" ||
        emailType === "magiclink" ||
        emailType === "email_change" ||
        emailType === "reauthenticate") &&
        !enableWelcome)
    ) {
      console.info(`send-email hook: ${emailType} emails disabled, skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    console.info(
      "send-email hook: email dispatched",
      JSON.stringify({
        subject: resolvedEmail.subject,
        messageId: sendResult.data?.id,
      })
    );

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
