// packages/ui/src/lib/email.ts
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";

// Initialize Resend client - will be created when needed
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const error = new Error(
        "RESEND_API_KEY environment variable is required"
      );
      Sentry.captureException(error);
      throw error;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  id?: string;
  error?: string;
}

// Utility function to sanitize tag values for Resend
function sanitizeTagValue(value: string): string {
  // Resend tags can only contain ASCII letters, numbers, underscores, or dashes
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace invalid chars with underscore
    .toLowerCase()
    .substring(0, 256); // Resend has a length limit
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<EmailResponse> {
  try {
    const resend = getResendClient();

    const defaultFrom =
      process.env.SUPPORT_EMAIL || "support@auth.voltguardai.com";

    // Sanitize tags to prevent Resend validation errors
    const sanitizedTags = options.tags?.map((tag) => ({
      name: sanitizeTagValue(tag.name),
      value: sanitizeTagValue(tag.value),
    }));

    const emailData = {
      from: options.from || defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      react: options.react,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
      headers: options.headers,
      tags: sanitizedTags,
    };

    // Remove undefined values to keep the payload clean
    Object.keys(emailData).forEach((key) => {
      if (emailData[key as keyof typeof emailData] === undefined) {
        delete emailData[key as keyof typeof emailData];
      }
    });

    const result = await resend.emails.send(emailData);

    if (result.error) {
      Sentry.captureException(result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      id: result.data?.id,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Utility function to check if Resend is configured
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
