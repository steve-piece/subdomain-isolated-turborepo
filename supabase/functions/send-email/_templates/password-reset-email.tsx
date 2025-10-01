// supabase/functions/send-email/_templates/password-reset-email.tsx
import * as React from "npm:react@18.3.1";

import {
  BaseEmail,
  EmailButton,
  EmailHeading,
  EmailText,
} from "./base-email.tsx";

export interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  organizationName?: string;
  appName: string;
  marketingUrl: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  organizationName,
  appName,
  marketingUrl,
}: PasswordResetEmailProps): React.ReactElement {
  const previewText = "Reset your password - action required";

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>Reset Your Password</EmailHeading>

      {userName && <EmailText>Hi {userName}!</EmailText>}

      <EmailText>
        You requested to reset your password
        {organizationName ? ` for ${organizationName}` : ""}. Click the button
        below to create a new password:
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={resetUrl}>Reset Password</EmailButton>
      </div>

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        This link will expire in 1 hour for security reasons.
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
