// packages/ui/src/components/emails/notification-email.tsx 
import React from "react";
import { BaseEmail, EmailButton, EmailHeading, EmailText } from "./base-email";

export interface NotificationEmailProps {
  userName: string;
  organizationName: string;
  notificationTitle: string;
  notificationMessage: string;
  actionUrl?: string;
  actionText?: string;
}

export function NotificationEmail({
  userName,
  organizationName,
  notificationTitle,
  notificationMessage,
  actionUrl,
  actionText,
}: NotificationEmailProps) {
  return (
    <BaseEmail previewText={notificationTitle}>
      <EmailHeading>{notificationTitle}</EmailHeading>
      <EmailText>Hi {userName},</EmailText>
      <EmailText>{notificationMessage}</EmailText>

      {actionUrl && actionText && (
        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <EmailButton href={actionUrl}>{actionText}</EmailButton>
        </div>
      )}

      <EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        From your {organizationName} team
      </EmailText>
    </BaseEmail>
  );
}
