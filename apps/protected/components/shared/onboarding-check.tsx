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
    // Only show modal if:
    // 1. Organization needs onboarding
    // 2. User is the owner
    // 3. Not already dismissed (check sessionStorage)
    const dismissed = sessionStorage.getItem(
      `onboarding-dismissed-${subdomain}`,
    );

    if (needsOnboarding && isOwner && !dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [needsOnboarding, isOwner, subdomain]);

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
