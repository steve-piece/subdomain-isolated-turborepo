// apps/protected/components/shared/scroll-to-top.tsx
// Client component that scrolls to top on pathname change for better navigation UX
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop component automatically scrolls the page to the top
 * when the pathname changes during client-side navigation.
 * 
 * This is particularly important for cached routes where Next.js maintains
 * scroll position by default. For routes like settings pages where users
 * expect to start at the top of new content, this component ensures
 * consistent behavior.
 * 
 * Usage: Place in layout.tsx to apply to all child routes
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
