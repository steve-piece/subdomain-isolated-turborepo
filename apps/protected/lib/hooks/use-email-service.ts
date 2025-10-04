// apps/protected/lib/hooks/use-email-service.ts
import { createClient } from "@/lib/supabase/client";

interface CustomEmailPayload {
  userId: string;
  templateType: "notification" | "announcement" | "reminder";
  templateData: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  };
}

export function useEmailService() {
  const supabase = createClient();

  const sendCustomEmail = async (payload: CustomEmailPayload) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("No authenticated session");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-custom-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Failed to send email");
    }

    return response.json();
  };

  return { sendCustomEmail };
}
