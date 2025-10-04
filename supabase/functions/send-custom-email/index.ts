// supabase/functions/send-custom-email/index.ts
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { renderAsync } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { Resend } from "npm:resend@4.0.0";
import { getServiceRoleClient } from "./_lib/supabase-client.ts";

import { NotificationEmail } from "./_templates/notification-email.tsx";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is required for send-custom-email");
}

const resend = new Resend(resendApiKey);
const supabase = getServiceRoleClient();

interface CustomEmailRequest {
  userId: string;
  templateType: "notification" | "announcement" | "reminder";
  templateData: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CustomEmailRequest;

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(
        `
          full_name,
          email,
          org_id,
          tenant:tenants!inner(
            company_name,
            subdomain
          )
        `,
      )
      .eq("user_id", body.userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    const html = await renderAsync(
      React.createElement(NotificationEmail, {
        userName: profile.full_name ?? profile.email ?? caller.email,
        organizationName: profile.tenant?.company_name ?? "Your Organization",
        notificationTitle: body.templateData.title,
        notificationMessage: body.templateData.message,
        actionUrl: body.templateData.actionUrl,
        actionText: body.templateData.actionText,
      }),
    );

    const result = await resend.emails.send({
      from: Deno.env.get("SUPPORT_EMAIL") ?? "support@auth.voltguardai.com",
      to: [profile.email ?? caller.email],
      subject: body.templateData.title,
      html,
    });

    if (result.error) {
      throw result.error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: result.data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Custom email error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
