// apps/protected/components/billing/manage-billing-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { createBillingPortalSession } from "@/app/actions/billing/checkout";
import { useToast } from "@workspace/ui/components/toast";

interface ManageBillingButtonProps {
  orgId: string;
  subdomain: string;
}

export function ManageBillingButton({
  orgId,
  subdomain,
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleManage = async () => {
    setIsLoading(true);

    try {
      const result = await createBillingPortalSession(orgId, subdomain);

      if (result.success && result.url) {
        // Redirect to Stripe Billing Portal
        window.location.href = result.url;
      } else {
        addToast(result.error || "Failed to open billing portal", "error");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      addToast("An unexpected error occurred", "error");
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={isLoading}>
      {isLoading ? "Loading..." : "Manage Billing"}
    </Button>
  );
}
