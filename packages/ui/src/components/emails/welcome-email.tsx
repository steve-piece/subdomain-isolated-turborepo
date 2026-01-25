// packages/ui/src/components/emails/welcome-email.tsx
import React from "react";
import { BaseEmail, EmailButton, EmailHeading, EmailText } from "./base-email";

export interface WelcomeEmailProps {
  userName: string;
  organizationName: string;
  subdomain: string;
  dashboardUrl: string;
  supportEmail?: string | "support@emaildomain.com";
  emailDomain?: string | "emaildomain.com";
}

export function WelcomeEmail({
  userName,
  organizationName,
  subdomain,
  dashboardUrl,
  supportEmail = process.env.SUPPORT_EMAIL || "support@emaildomain.com",
}: WelcomeEmailProps) {
  const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "emaildomain.com";
  const defaultSupportEmail =
    supportEmail || process.env.SUPPORT_EMAIL || `support@${EMAIL_DOMAIN}`;
  const previewText = `Welcome to ${organizationName}! Your account is now active and ready to use.`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>Welcome to {organizationName}!</EmailHeading>

      <EmailText>Hi {userName}! 🎉</EmailText>

      <EmailText>
        Your account has been successfully activated and you&apos;re now ready
        to start using your organization workspace. We&apos;re excited to have
        you on board!
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={dashboardUrl}>Access Your Dashboard</EmailButton>
      </div>

      <EmailText>
        <strong>Your Organization Details:</strong>
      </EmailText>

      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "16px",
          borderRadius: "6px",
          border: "1px solid #e5e7eb",
          margin: "16px 0",
        }}
      >
        <EmailText style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
          <strong>Organization:</strong> {organizationName}
        </EmailText>
        <EmailText style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
          <strong>Subdomain:</strong> {subdomain}
        </EmailText>
        <EmailText style={{ margin: "0", fontSize: "14px" }}>
          <strong>Dashboard URL:</strong>{" "}
          <a href={dashboardUrl} style={{ color: "#2563eb" }}>
            {dashboardUrl}
          </a>
        </EmailText>
      </div>

      <EmailText>Here&apos;s what you can do next:</EmailText>

      <ul
        style={{
          color: "#374151",
          fontSize: "16px",
          lineHeight: "1.6",
          paddingLeft: "20px",
        }}
      >
        <li style={{ marginBottom: "8px" }}>
          Explore your dashboard and customize your workspace
        </li>
        <li style={{ marginBottom: "8px" }}>
          Invite team members to collaborate
        </li>
        <li style={{ marginBottom: "8px" }}>
          Set up your organization preferences
        </li>
        <li>Check out our app&apos;s features</li>
      </ul>

      <EmailText
        style={{
          fontSize: "14px",
          color: "#6b7280",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "16px",
          marginTop: "32px",
        }}
      >
        If you have any questions or need help getting started, don&apos;t
        hesitate to reach out to us at{" "}
        <a href={`mailto:${supportEmail}`} style={{ color: "#2563eb" }}>
          {defaultSupportEmail}
        </a>
        .
      </EmailText>
    </BaseEmail>
  );
}
