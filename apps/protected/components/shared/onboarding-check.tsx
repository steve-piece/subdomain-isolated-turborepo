// apps/protected/components/onboarding-check.tsx
"use client";

import { useState, useEffect } from "react";
import { OnboardingModal } from "./onboarding-modal";

interface OnboardingCheckProps {
  organizationName: string;
  subdomain: string;
  needsOnboarding: boolean;
  isOwner: boolean;
}

export function OnboardingCheck({
  organizationName,
  subdomain,
  needsOnboarding,
  isOwner,
}: OnboardingCheckProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // TEMPORARY: Show modal for ALL users for testing
    // TODO: Remove this and uncomment the original logic below
    const dismissed = sessionStorage.getItem(
      `onboarding-dismissed-${subdomain}`
    );

    if (!dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }

    // ORIGINAL LOGIC (commented out for testing):
    // Only show modal if:
    // 1. Organization needs onboarding
    // 2. User is the owner
    // 3. Not already dismissed (check sessionStorage)
    // const dismissed = sessionStorage.getItem(
    //   `onboarding-dismissed-${subdomain}`
    // );

    // if (needsOnboarding && isOwner && !dismissed) {
    //   // Small delay for better UX
    //   const timer = setTimeout(() => {
    //     setShowModal(true);
    //   }, 500);

    //   return () => clearTimeout(timer);
    // }
  }, [subdomain]);

  const handleComplete = () => {
    setShowModal(false);
    // Refresh the page to show updated data
    window.location.reload();
  };

  if (!showModal) {
    return null;
  }

  return (
    <OnboardingModal
      organizationName={organizationName}
      subdomain={subdomain}
      onComplete={handleComplete}
    />
  );
}
