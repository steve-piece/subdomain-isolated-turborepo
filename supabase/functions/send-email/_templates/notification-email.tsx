// supabase/functions/send-email/_templates/notification-email.tsx
import * as React from "react";
import {
  BaseEmail,
  EmailButton,
  EmailHeading,
  EmailText,
} from "./base-email.tsx";

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
  return React.createElement(
    BaseEmail,
    { previewText: notificationTitle },
    React.createElement(EmailHeading, null, notificationTitle),
    React.createElement(EmailText, null, `Hi ${userName},`),
    React.createElement(EmailText, null, notificationMessage),

    actionUrl &&
      actionText &&
      React.createElement(
        "div",
        { style: { textAlign: "center", margin: "32px 0" } },
        React.createElement(EmailButton, { href: actionUrl }, actionText)
      ),

    React.createElement(
      EmailText,
      { style: { fontSize: "14px", color: "#6b7280" } },
      `From your ${organizationName} team`
    )
  );
}
