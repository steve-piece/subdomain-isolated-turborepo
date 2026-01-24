// supabase/functions/send-email/_templates/signup-confirmation-email.tsx
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
  appName: string;
  marketingUrl: string;
}

export function SignupConfirmationEmail({
  userName,
  organizationName,
  confirmationUrl,
  appName,
  marketingUrl,
}: SignupConfirmationEmailProps): React.ReactElement {
  const previewText = `Welcome to ${appName}! Please confirm your email address.`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>Welcome to {appName}!</EmailHeading>

      <EmailText>Hi {userName}!</EmailText>

      <EmailText>
        Thank you for signing up. Please click the button below to verify your
        email address and complete your setup:
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={confirmationUrl}>Verify Email Address</EmailButton>
      </div>

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        This link will expire in 24 hours for security reasons.
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
