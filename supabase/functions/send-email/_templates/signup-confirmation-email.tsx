import * as React from "npm:react@18.3.1";

import {
  BaseEmail,
  EmailButton,
  EmailHeading,
  EmailText,
} from "./base-email.tsx";

export interface SignupConfirmationEmailProps {
  userName: string;
  organizationName: string;
  confirmationUrl: string;
  subdomain: string;
}

export function SignupConfirmationEmail({
  userName,
  organizationName,
  confirmationUrl,
  subdomain,
}: SignupConfirmationEmailProps): React.ReactElement {
  const previewText = `Welcome to ${organizationName}! Please confirm your email address.`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>Welcome to {organizationName}!</EmailHeading>

      <EmailText>Hi {userName}!</EmailText>

      <EmailText>
        Thank you for creating your organization account. Please click the
        button below to verify your email address and complete your setup:
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={confirmationUrl}>Verify Email Address</EmailButton>
      </div>

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        <strong>Organization:</strong> {organizationName}
        <br />
        <strong>Subdomain:</strong> {subdomain}
        <br />
        <strong>Your Role:</strong> Owner
      </EmailText>

      <EmailText>
        Once verified, you can access your organization workspace at your
        subdomain URL.
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
        This link will expire in 24 hours. If you didn&apos;t create this
        account, you can safely ignore this email.
      </EmailText>
    </BaseEmail>
  );
}
