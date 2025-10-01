// supabase/functions/send-email/_templates/magic-link-email.tsx
import * as React from "npm:react@18.3.1";

import {
  BaseEmail,
  EmailButton,
  EmailHeading,
  EmailText,
} from "./base-email.tsx";

export interface MagicLinkEmailProps {
  userName?: string;
  magicLinkUrl: string;
  organizationName?: string;
  appName: string;
  marketingUrl: string;
}

export function MagicLinkEmail({
  userName,
  magicLinkUrl,
  organizationName,
  appName,
  marketingUrl,
}: MagicLinkEmailProps): React.ReactElement {
  const previewText = `Your magic link to sign in${organizationName ? ` to ${organizationName}` : ""}`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>
        🔐 Sign In {organizationName ? `to ${organizationName}` : ""}
      </EmailHeading>

      {userName && <EmailText>Hi {userName}!</EmailText>}

      <EmailText>
        Click the button below to securely sign in to your account. This link
        will expire in 1 hour and can only be used once.
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={magicLinkUrl}>Sign In Now</EmailButton>
      </div>

      <EmailText
        style={{
          fontSize: "14px",
          color: "#6b7280",
          backgroundColor: "#f9fafb",
          padding: "12px",
          borderRadius: "6px",
          borderLeft: "3px solid #fbbf24",
        }}
      >
        <strong>⚠️ Security Note:</strong> If you didn&apos;t request this magic
        link, please ignore this email. Never share this link with anyone.
      </EmailText>

      <EmailText
        style={{
          fontSize: "14px",
          color: "#6b7280",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "16px",
          marginTop: "32px",
          textAlign: "center",
        }}
      >
        Not sure why you&apos;re seeing this?{" "}
        <a
          href={marketingUrl}
          style={{
            color: "#3b82f6",
            textDecoration: "none",
          }}
        >
          Learn more about {appName}
        </a>
      </EmailText>
    </BaseEmail>
  );
}
