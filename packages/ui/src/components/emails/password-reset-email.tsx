// packages/ui/src/components/emails/password-reset-email.tsx
import React from "react";
import { BaseEmail, EmailButton, EmailHeading, EmailText } from "./base-email";

export interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  organizationName?: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  organizationName,
}: PasswordResetEmailProps) {
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
        }}
      >
        If you didn&apos;t request this password reset, you can safely ignore
        this email. Your password will not be changed.
      </EmailText>
    </BaseEmail>
  );
}
