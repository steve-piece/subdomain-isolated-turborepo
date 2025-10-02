// apps/protected/lib/stripe/server.ts
import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Please add it to your environment variables."
      );
    }

    // Initialize Stripe with the pinned API version (SDK default)
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Uses the SDK's pinned API version for stability
      typescript: true,
      appInfo: {
        name: "Subdomain Isolated Turborepo",
        version: "1.0.0",
      },
    });
  }

  return stripeInstance;
}

// Backwards compatibility - but prefer using getStripe()
export const stripe = new Proxy({} as Stripe, {
  get: (_, prop) => {
    const instance = getStripe();
    return instance[prop as keyof Stripe];
  },
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",

  // Plan IDs - Replace these with your actual Stripe Price IDs
  plans: {
    free: {
      monthly: process.env.STRIPE_FREE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_FREE_YEARLY_PRICE_ID || "",
    },
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
    },
    enterprise: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "",
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || "",
    },
  },
} as const;

// Type guard to check if webhook secret is configured
export function isWebhookConfigured(): boolean {
  return !!STRIPE_CONFIG.webhookSecret;
}

// Helper to get the base URL for redirects
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_DOMAIN) {
    return `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003";
}
