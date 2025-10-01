// apps/protected/components/billing/upgrade-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { createCheckoutSession } from "@/app/actions/billing/checkout";
import { useToast } from "@workspace/ui/components/toast";

interface UpgradeButtonProps {
  orgId: string;
  subdomain: string;
  priceId: string;
  planName: string;
}

export function UpgradeButton({
  orgId,
  subdomain,
  priceId,
  planName,
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const result = await createCheckoutSession(orgId, priceId, subdomain);

      if (result.success && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        addToast(result.error || "Failed to create checkout session", "error");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      addToast("An unexpected error occurred", "error");
      setIsLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={handleUpgrade} disabled={isLoading}>
      {isLoading ? "Loading..." : `Upgrade to ${planName}`}
    </Button>
  );
}
