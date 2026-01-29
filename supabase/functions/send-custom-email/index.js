// supabase/functions/send-custom-email/index.js 
"use strict";
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Setup type definitions for built-in Supabase Runtime APIs
require("jsr:@supabase/functions-js/edge-runtime.d.ts");
const components_0_0_22_1 = require("npm:@react-email/components@0.0.22");
const React = __importStar(require("npm:react@18.3.1"));
const npm_resend_4_0_0_1 = require("npm:resend@4.0.0");
const supabase_client_ts_1 = require("./_lib/supabase-client.ts");
const notification_email_tsx_1 = require("./_templates/notification-email.tsx");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is required for send-custom-email");
}
const resend = new npm_resend_4_0_0_1.Resend(resendApiKey);
const supabase = (0, supabase_client_ts_1.getServiceRoleClient)();
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
        const { data: { user: caller }, error: authError, } = await supabase.auth.getUser(token);
        if (authError || !caller) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
        const body = (await req.json());
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select(`
          full_name,
          email,
          org_id,
          tenant:tenants!inner(
            company_name,
            subdomain
          )
        `)
            .eq("user_id", body.userId)
            .single();
        if (profileError || !profile) {
            throw new Error("User profile not found");
        }
        const html = await (0, components_0_0_22_1.renderAsync)(React.createElement(notification_email_tsx_1.NotificationEmail, {
            userName: profile.full_name ?? profile.email ?? caller.email,
            organizationName: profile.tenant?.company_name ?? "Your Organization",
            notificationTitle: body.templateData.title,
            notificationMessage: body.templateData.message,
            actionUrl: body.templateData.actionUrl,
            actionText: body.templateData.actionText,
        }));
        const result = await resend.emails.send({
            from: Deno.env.get("NEXT_PUBLIC_SUPPORT_EMAI") ?? "support@emaildomain.com",
            to: [profile.email ?? caller.email],
            subject: body.templateData.title,
            html,
        });
        if (result.error) {
            throw result.error;
        }
        return new Response(JSON.stringify({
            success: true,
            id: result.data?.id,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Custom email error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
