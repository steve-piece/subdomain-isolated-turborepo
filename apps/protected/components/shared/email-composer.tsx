// apps/protected/components/email-composer.tsx
// Simple UI helper to trigger custom emails from within the protected app shell.
"use client";

import { useState } from "react";

import { useEmailService } from "@/lib/hooks/use-email-service";
import { Button } from "@workspace/ui/components/button";

export function EmailComposer({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { sendCustomEmail } = useEmailService();

  const handleSendNotification = async () => {
    setIsLoading(true);
    try {
      await sendCustomEmail({
        userId,
        templateType: "notification",
        templateData: {
          title: "Important Update",
          message: "Your account has been updated with new features.",
          actionUrl: "https://marketingdomain.com/dashboard",
          actionText: "View Dashboard",
        },
      });
      alert("Email sent successfully!");
    } catch (error) {
      alert(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Error sending email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleSendNotification} disabled={isLoading}>
      {isLoading ? "Sending..." : "Send Notification"}
    </Button>
  );
}
