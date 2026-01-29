// apps/protected/components/require-capability.tsx
/**
 * Component-level capability guard
 * Hides content if user doesn't have required capability
 */
"use client";

import { useEffect, useState } from "react";
import type { CapabilityKey } from "@/lib/rbac/capabilities";
import { checkUserCapability } from "@/lib/rbac/server-actions";

interface RequireCapabilityProps {
  orgId: string;
  capability: CapabilityKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireCapability({
  orgId,
  capability,
  children,
  fallback = null,
}: RequireCapabilityProps) {
  const [hasCapability, setHasCapability] = useState<boolean | null>(null);

  useEffect(() => {
    checkUserCapability(orgId, capability).then((result) => {
      setHasCapability(result.hasCapability);
    });
  }, [orgId, capability]);

  // Loading state
  if (hasCapability === null) {
    return null;
  }

  // No capability
  if (!hasCapability) {
    return <>{fallback}</>;
  }

  // Has capability
  return <>{children}</>;
}

/**
 * Hook to check capability
 */
export function useCapability(orgId: string, capability: CapabilityKey) {
  const [hasCapability, setHasCapability] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    checkUserCapability(orgId, capability).then((result) => {
      setHasCapability(result.hasCapability);
      setIsLoading(false);
    });
  }, [orgId, capability]);

  return { hasCapability, isLoading };
}
