// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/layout.tsx
/**
 * Layout for organization settings routes with tabs navigation
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Building2, Users, CreditCard, Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const orgSettingsTabs = [
  {
    title: "General",
    path: "org-settings",
    icon: Building2,
  },
  {
    title: "Team",
    path: "org-settings/team",
    icon: Users,
  },
  {
    title: "Roles",
    path: "org-settings/roles",
    icon: Shield,
  },
  {
    title: "Billing",
    path: "org-settings/billing",
    icon: CreditCard,
  },
];

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organization Settings" />
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Manage your organization&apos;s configuration and team
              </p>
            </div>
            <div className="relative">
              {/* Gradient fade indicators for scroll overflow */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/50 to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/50 to-transparent z-10" />

              <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {orgSettingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  const fullHref = `/s/${subdomain}/${tab.path}`;
                  const isActive = pathname === fullHref;

                  return (
                    <Link
                      key={tab.path}
                      href={fullHref}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.title}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
