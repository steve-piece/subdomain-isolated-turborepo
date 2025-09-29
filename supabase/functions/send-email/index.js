// supabase/functions/send-email/index.js
"use strict";
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
// Setup type definitions for built-in Supabase Runtime APIs
require("jsr:@supabase/functions-js/edge-runtime.d.ts");
const components_0_0_22_1 = require("npm:@react-email/components@0.0.22");
const React = __importStar(require("npm:react@18.3.1"));
const npm_resend_4_0_0_1 = require("npm:resend@4.0.0");
const npm_standardwebhooks_1_0_0_1 = require("npm:standardwebhooks@1.0.0");
const signup_confirmation_email_tsx_1 = require("./_templates/signup-confirmation-email.tsx");
const password_reset_email_tsx_1 = require("./_templates/password-reset-email.tsx");
const user_invitation_email_tsx_1 = require("./_templates/user-invitation-email.tsx");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is required for the send-email hook");
}
const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
if (!rawHookSecret) {
  throw new Error("SEND_EMAIL_HOOK_SECRET is required for the send-email hook");
}
const hookSecret = rawHookSecret.replace("v1,whsec_", "");
const resend = new npm_resend_4_0_0_1.Resend(resendApiKey);
const webhookVerifier = new npm_standardwebhooks_1_0_0_1.Webhook(hookSecret);
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
function mapMetadata(metadata) {
  const result = {};
  if (!metadata) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}
function composeTenantUrl(subdomain, path, options = {}) {
  const { redirectTo, siteUrl, query, hash, preserveExistingPath } = options;
  const baseCandidates = [];
  if (subdomain && appDomain) {
    baseCandidates.push(`https://${subdomain}.${appDomain}`);
  }
  if (siteUrl) {
    baseCandidates.push(siteUrl);
  }
  if (redirectTo) {
    baseCandidates.push(redirectTo);
  }
  if (marketingDomain) {
    baseCandidates.push(`https://${marketingDomain}`);
  }
  let url;
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
const AuthPaths = {
  signup: "/auth/confirm",
  recovery: "/auth/update-password",
  magiclink: "/auth/confirm",
  invite: "/auth/accept-invitation",
  email_change: "/auth/confirm",
  reauthenticate: "/auth/reauthenticate",
  "recovery-complete": "/auth/update-password/complete",
  "invite-accept": "/auth/accept-invitation/complete",
};
function buildAuthUrl(subdomain, pathKey, options = {}) {
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
  action,
  tokenHash,
  redirectTo,
  siteUrl,
  subdomain
) {
  return buildAuthUrl(subdomain, action, {
    redirectTo,
    siteUrl,
    query: {
      token_hash: tokenHash,
      type: action,
    },
  });
}
function resolveEmail({ user, email_data }) {
  const metadata = mapMetadata(email_data.data);
  const userMetadata = mapMetadata(user.user_metadata);
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
        react: React.createElement(
          signup_confirmation_email_tsx_1.SignupConfirmationEmail,
          {
            userName: fullName ?? user.email,
            organizationName,
            confirmationUrl,
            subdomain: subdomain ?? "",
          }
        ),
      };
    }
    case "recovery": {
      const resetUrl =
        buildAuthUrl(subdomain, "recovery", {
          redirectTo: email_data.redirect_to,
          siteUrl: email_data.site_url,
          query: {
            type: email_data.email_action_type,
          },
          hash: {
            access_token: email_data.token,
            refresh_token: email_data.token_new ?? email_data.token_hash,
            type: email_data.email_action_type,
            token_hash: email_data.token_hash,
          },
        }) ?? "";
      return {
        subject: `Reset your password for ${organizationName}`,
        react: React.createElement(
          password_reset_email_tsx_1.PasswordResetEmail,
          {
            userName: fullName,
            organizationName,
            resetUrl,
          }
        ),
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
        react: React.createElement(
          user_invitation_email_tsx_1.UserInvitationEmail,
          {
            organizationName,
            inviterName: inviterName ?? inviterEmail ?? organizationName,
            inviterEmail: inviterEmail ?? "",
            invitationUrl,
            userRole,
            recipientEmail: user.email,
          }
        ),
      };
    }
    case "magiclink": {
      return {
        subject: "Your magic link",
        text: `Use this link to sign in: ${buildConfirmationUrl(email_data.email_action_type, email_data.token_hash, email_data.redirect_to, email_data.site_url, subdomain) ?? email_data.token}`,
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
        react: React.createElement(notification_email_tsx_1.NotificationEmail, {
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
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  try {
    const event = webhookVerifier.verify(payload, headers);

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

    const resolvedEmail = resolveEmail(event);
    let html;
    if (resolvedEmail.react) {
      html = await (0, components_0_0_22_1.renderAsync)(resolvedEmail.react);
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
