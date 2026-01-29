// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/layout.tsx
/**
 * Layout for user settings routes with modern tabs navigation
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { User, Shield, Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const userSettingsTabs = [
  {
    title: "Profile",
    description: "Manage your personal information",
    path: "profile",
    icon: User,
  },
  {
    title: "Security",
    description: "Password & two-factor authentication",
    path: "security",
    icon: Shield,
  },
  {
    title: "Notifications",
    description: "Email preferences & alerts",
    path: "notifications",
    icon: Bell,
  },
];

export default function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  // Get the current active route by checking pathname
  // After middleware rewrite: http://subdomain.localhost:3003/security 
  // becomes internal path: /s/subdomain/security
  // Pathname will be: /s/subdomain/security
  
  let currentRoute = "";
  
  if (pathname) {
    // Remove leading slash and split
    const pathSegments = pathname.split("/").filter(Boolean);
    
    // Path should be: /s/subdomain/route
    // pathSegments: ["s", "subdomain", "route"]
    if (pathSegments[0] === "s" && pathSegments[2]) {
      currentRoute = pathSegments[2];
    } 
    // Fallback: just use the last segment
    else if (pathSegments.length > 0) {
      currentRoute = pathSegments[pathSegments.length - 1] || "";
    }
  }

  // Debug logging
  console.log("🔍 User Settings Navigation Debug:", {
    pathname,
    subdomain,
    pathSegments: pathname?.split("/").filter(Boolean),
    currentRoute,
    lastSegment: pathname?.split("/").filter(Boolean).pop() || "",
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <PageHeader title="Settings" />

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-1" aria-label="Settings tabs">
            {userSettingsTabs.map((tab) => {
              const Icon = tab.icon;
              // Generate the correct href based on the URL pattern
              const fullPath = subdomain ? `/s/${subdomain}/${tab.path}` : `/${tab.path}`;
              // Check if current route matches this tab's path
              const isActive = currentRoute === tab.path;

              // Debug each tab
              console.log(`📍 Tab: ${tab.title} | tab.path: "${tab.path}" | currentRoute: "${currentRoute}" | isActive: ${isActive}`);

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
                        ? "bg-primary h-[2px]"
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
