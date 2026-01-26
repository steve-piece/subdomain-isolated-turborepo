// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/layout.tsx
/**
 * Layout for organization settings routes with modern tabs navigation
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Building2, Users, CreditCard, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const orgSettingsTabs = [
  {
    title: "General",
    description: "Organization details and branding",
    path: "org-settings",
    routeSegment: "org-settings",
    icon: Building2,
  },
  {
    title: "Team",
    description: "Manage team members and invitations",
    path: "org-settings/team",
    routeSegment: "team",
    icon: Users,
  },
  {
    title: "Roles",
    description: "Custom roles and permissions",
    path: "org-settings/roles",
    routeSegment: "roles",
    icon: ShieldCheck,
  },
  {
    title: "Billing",
    description: "Plans, payments, and invoices",
    path: "org-settings/billing",
    routeSegment: "billing",
    icon: CreditCard,
  },
];

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  // Smart path detection for both URL patterns:
  // Pattern 1: http://subdomain.localhost:3003/org-settings/team -> pathname: /org-settings/team
  // Pattern 2: http://localhost:3003/s/subdomain/org-settings/team -> pathname: /s/subdomain/org-settings/team
  
  let currentRoute = "";
  
  if (pathname) {
    // Check if we're in org-settings section
    if (pathname.includes("/org-settings")) {
      const segments = pathname.split("/").filter(Boolean);
      
      // Find the segment after 'org-settings'
      const orgSettingsIndex = segments.indexOf("org-settings");
      const nextSegment = segments[orgSettingsIndex + 1];
      
      if (orgSettingsIndex !== -1 && nextSegment) {
        // Sub-route like /org-settings/team
        currentRoute = nextSegment;
      } else {
        // Base route /org-settings
        currentRoute = "org-settings";
      }
    }
  }

  // Debug logging
  console.log("🔍 Org Settings Navigation Debug:", {
    pathname,
    subdomain,
    currentRoute,
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <PageHeader title="Organization Settings" />

      {/* Navigation Tabs - Sticky */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-1" aria-label="Organization settings tabs">
            {orgSettingsTabs.map((tab) => {
              const Icon = tab.icon;
              // Generate the correct href based on the URL pattern
              const fullPath = subdomain ? `/s/${subdomain}/${tab.path}` : `/${tab.path}`;
              // Check if current route matches this tab's route segment
              const isActive = currentRoute === tab.routeSegment;

              // Debug each tab
              console.log(`Tab: ${tab.title} | RouteSegment: ${tab.routeSegment} | fullPath: ${fullPath} | Active: ${isActive}`);

              return (
                <Link
                  key={tab.path}
                  href={fullPath}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-4 py-4 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Icon */}
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />

                  {/* Label */}
                  <span className="hidden sm:block">{tab.title}</span>

                  {/* Active indicator - 2px blue bottom border */}
                  <span
                    className={cn(
                      "absolute inset-x-0 -bottom-px h-0.5 transition-all duration-200",
                      isActive
                        ? "bg-blue-600 h-[2px]"
                        : "bg-transparent group-hover:bg-border"
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
