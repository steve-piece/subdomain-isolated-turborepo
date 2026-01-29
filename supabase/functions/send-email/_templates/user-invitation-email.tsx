// supabase/functions/send-email/_templates/user-invitation-email.tsx
import * as React from "npm:react@18.3.1";

import {
  BaseEmail,
  EmailButton,
  EmailHeading,
  EmailText,
} from "./base-email.tsx";

export interface UserInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  invitationUrl: string;
  recipientEmail: string;
  appName: string;
  marketingUrl: string;
}

export function UserInvitationEmail({
  organizationName,
  inviterName,
  inviterEmail,
  invitationUrl,
  recipientEmail,
  appName,
  marketingUrl,
}: UserInvitationEmailProps): React.ReactElement {
  const previewText = `You've been invited to join ${organizationName} on ${appName}`;

  return (
    <BaseEmail previewText={previewText}>
      <EmailHeading>
        You&apos;re invited to join {organizationName}!
      </EmailHeading>

      <EmailText>
        {inviterName} ({inviterEmail}) has invited you to join{" "}
        <strong>{organizationName}</strong> on <strong>{appName}</strong>.
      </EmailText>

      <EmailText>
        Click the button below to accept your invitation and get started:
      </EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <EmailButton href={invitationUrl}>Accept Invitation</EmailButton>
      </div>

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
