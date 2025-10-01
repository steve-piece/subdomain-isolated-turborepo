// supabase/functions/send-email/_templates/two-factor-email.tsx
import * as React from "npm:react@18.3.1";

import { BaseEmail, EmailHeading, EmailText } from "./base-email.tsx";

export interface TwoFactorEmailProps {
  userName?: string;
  verificationCode: string;
  organizationName?: string;
  appName: string;
  marketingUrl: string;
}

export function TwoFactorEmail({
  userName,
  verificationCode,
  organizationName,
  appName,
  marketingUrl,
}: TwoFactorEmailProps): React.ReactElement {
  const previewText = `Your verification code: ${verificationCode}`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>🔐 Two-Factor Authentication</EmailHeading>

      {userName && <EmailText>Hi {userName}!</EmailText>}

      <EmailText>
        You&apos;re attempting to sign in
        {organizationName ? ` to ${organizationName}` : ""}. Please use the
        verification code below to complete your login:
      </EmailText>

      {/* Verification Code Display */}
      <div
        style={{
          textAlign: "center",
          margin: "32px 0",
          padding: "24px",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          border: "2px dashed #d1d5db",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "#6b7280",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          Verification Code
        </div>
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "#1f2937",
            letterSpacing: "8px",
            fontFamily: "monospace",
          }}
        >
          {verificationCode}
        </div>
      </div>

      <EmailText
        style={{ textAlign: "center", fontSize: "14px", color: "#6b7280" }}
      >
        Enter this code in your browser to continue. This code expires in 10
        minutes.
      </EmailText>

      <EmailText
        style={{
          fontSize: "14px",
          color: "#6b7280",
          backgroundColor: "#fef3c7",
          padding: "12px",
          borderRadius: "6px",
          borderLeft: "3px solid #f59e0b",
          marginTop: "24px",
        }}
      >
        <strong>⚠️ Security Alert:</strong> If you didn&apos;t attempt to sign
        in, someone may be trying to access your account. Please secure your
        account immediately.
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
