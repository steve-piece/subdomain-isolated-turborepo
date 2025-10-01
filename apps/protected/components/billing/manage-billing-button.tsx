// apps/protected/components/billing/manage-billing-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { createBillingPortalSession } from "@/app/actions/billing/checkout";
import { useToast } from "@workspace/ui/hooks/use-toast";

interface ManageBillingButtonProps {
  orgId: string;
  subdomain: string;
}

export function ManageBillingButton({
  orgId,
  subdomain,
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManage = async () => {
    setIsLoading(true);

    try {
      const result = await createBillingPortalSession(orgId, subdomain);

      if (result.success && result.url) {
        // Redirect to Stripe Billing Portal
        window.location.href = result.url;
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to open billing portal",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={isLoading}>
      {isLoading ? "Loading..." : "Manage Billing"}
    </Button>
  );
}
