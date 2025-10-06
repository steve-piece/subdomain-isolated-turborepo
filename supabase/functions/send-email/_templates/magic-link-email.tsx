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
      <EmailHeading>Sign In to Your Account</EmailHeading>

      {userName && <EmailText>Hi {userName}!</EmailText>}

      <EmailText>
        Click the button below to sign in
        {organizationName ? ` to ${organizationName}` : ""}. No password needed!
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={magicLinkUrl}>Sign In to Dashboard</EmailButton>
      </div>

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        This link will expire in 1 hour for security reasons. If you didn&apos;t
        request this, please ignore this email.
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
