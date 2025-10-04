// packages/ui/src/lib/billing.ts
/**
 * Shared billing and subscription types used across apps
 */

export type SubscriptionTier = {
  id: string;
  name: string; // e.g., Free, Pro, Enterprise
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  org_id: string;
  tier_id: string;
  period_start: string; // ISO date
  period_end: string; // ISO date
  status: "active" | "trialing" | "past_due" | "canceled";
  created_at: string;
  updated_at: string;
};

export type FeatureLimit = {
  id: string;
  tier_id: string;
  feature_key: string; // e.g., "expensive_feature"
  limit_per_period: number | null; // null = unlimited
  created_at: string;
  updated_at: string;
};

export type UsageCounter = {
  org_id: string;
  feature_key: string;
  window_start: string; // e.g., month start (date_trunc result)
  count: number;
  updated_at: string;
};

export type EntitlementView = {
  org_id: string;
  feature_key: string;
  limit_per_period: number | null;
};
