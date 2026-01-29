// packages/ui/src/components/emails/user-invitation-email.tsx
import React from "react";
import { BaseEmail, EmailButton, EmailHeading, EmailText } from "./base-email";

export interface UserInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  invitationUrl: string;
  userRole: string;
  recipientEmail: string;
}

export function UserInvitationEmail({
  organizationName,
  inviterName,
  inviterEmail,
  invitationUrl,
  userRole,
  recipientEmail,
}: UserInvitationEmailProps) {
  const previewText = `You've been invited to join ${organizationName} by ${inviterName}`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>
        You&apos;re invited to join {organizationName}!
      </EmailHeading>

      <EmailText>
        Hi there! {inviterName} ({inviterEmail}) has invited you to join{" "}
        <strong>{organizationName}</strong>
        as a <strong>{userRole}</strong>.
      </EmailText>

      <EmailText>
        Click the button below to accept your invitation and get started:
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={invitationUrl}>Accept Invitation</EmailButton>
      </div>

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        <strong>Organization:</strong> {organizationName}
        <br />
        <strong>Your Role:</strong> {userRole}
        <br />
        <strong>Invited by:</strong> {inviterName} ({inviterEmail})<br />
        <strong>Your Email:</strong> {recipientEmail}
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
        This invitation will expire in 7 days. If you don&amp;t recognize this
        organization or didn&amp;t expect this invitation, you can safely ignore
        this email.
      </EmailText>
    </BaseEmail>
  );
}
