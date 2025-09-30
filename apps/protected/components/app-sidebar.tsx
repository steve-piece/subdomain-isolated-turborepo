"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Home,
  Users,
  Building2,
  CreditCard,
  Bell,
  User,
  Lock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  UserCog,
  Briefcase,
  Lock as LockIcon,
  ShieldCheck,
} from "lucide-react";

interface AppSidebarProps {
  subdomain: string;
  organizationName: string;
  userRole?: string;
  orgId?: string;
  userCapabilities?: string[];
}

interface NavigationItem {
  title: string;
  href: string;
  icon: typeof Home;
  description: string;
  requiredCapabilities?: string[];
  requiredRoles?: string[];
  isPremium?: boolean;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export function AppSidebar({
  subdomain,
  organizationName,
  userRole = "member",
  orgId,
  userCapabilities = [],
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  // Define navigation structure with RBAC requirements
  const navigationGroups: NavigationGroup[] = [
    {
      title: "Main",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Home,
          description: "Overview and quick actions",
        },
        {
          title: "Admin Panel",
          href: "/admin",
          icon: LayoutDashboard,
          description: "Organization management",
          requiredRoles: ["owner", "admin", "superadmin"],
          requiredCapabilities: ["org.settings.view"],
        },
      ],
    },
    {
      title: "User Settings",
      items: [
        {
          title: "Profile",
          href: "/settings/profile",
          icon: User,
          description: "Personal information",
          requiredCapabilities: ["profile.edit_own"],
        },
        {
          title: "Security",
          href: "/settings/security",
          icon: Lock,
          description: "Password & 2FA",
          requiredCapabilities: ["security.view_own"],
        },
        {
          title: "Notifications",
          href: "/settings/notifications",
          icon: Bell,
          description: "Email & alerts",
          requiredCapabilities: ["notifications.edit_own"],
        },
      ],
    },
    {
      title: "Organization",
      items: [
        {
          title: "General",
          href: "/org-settings",
          icon: Building2,
          description: "Company details",
          requiredRoles: ["owner", "admin", "superadmin"],
          requiredCapabilities: ["org.settings.view"],
        },
        {
          title: "Team",
          href: "/org-settings/team",
          icon: Users,
          description: "Manage members",
          requiredRoles: ["owner", "admin", "superadmin"],
          requiredCapabilities: ["team.view"],
        },
        {
          title: "Roles",
          href: "/org-settings/roles",
          icon: ShieldCheck,
          description: "Custom permissions",
          requiredRoles: ["owner"],
          requiredCapabilities: ["org.settings.view"],
          isPremium: true,
        },
        {
          title: "Billing",
          href: "/org-settings/billing",
          icon: CreditCard,
          description: "Plans & invoices",
          requiredRoles: ["owner", "admin"],
          requiredCapabilities: ["billing.view"],
          isPremium: true,
        },
      ],
    },
  ];

  /**
   * Check if user has access to a navigation item
   */
  const hasAccess = React.useCallback(
    (item: NavigationItem): boolean => {
      // Check role requirements
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        if (!item.requiredRoles.includes(userRole)) {
          return false;
        }
      }

      // Check capability requirements
      if (item.requiredCapabilities && item.requiredCapabilities.length > 0) {
        const hasAllCapabilities = item.requiredCapabilities.every((cap) =>
          userCapabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    },
    [userRole, userCapabilities]
  );

  /**
   * Filter navigation groups to show only accessible items
   */
  const filteredGroups = React.useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(hasAccess),
      }))
      .filter((group) => group.items.length > 0);
  }, [navigationGroups, hasAccess]);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b min-h-[73px]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate max-w-[140px]">
                {organizationName}
              </span>
              <span className="text-xs text-muted-foreground">{subdomain}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8 shrink-0", collapsed && "mx-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <h4 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                // Check if current pathname exactly matches OR if it's a nested route under this item
                // but ONLY if no other sibling nav item matches more specifically
                const isExactMatch = pathname === item.href;
                const isNestedRoute = pathname?.startsWith(item.href + "/");

                // Check if any sibling item is a more specific match
                const hasSiblingMatch = group.items.some(
                  (sibling) =>
                    sibling.href !== item.href &&
                    (pathname === sibling.href ||
                      pathname?.startsWith(sibling.href + "/"))
                );

                // Only highlight if exact match OR nested route without a more specific sibling match
                const isActive =
                  isExactMatch || (isNestedRoute && !hasSiblingMatch);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
                      "hover:bg-accent/50",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.title : undefined}
                    aria-label={item.title}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive && "text-primary-foreground"
                      )}
                    />
                    {!collapsed && (
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-1">
                          <span>{item.title}</span>
                          {item.isPremium && (
                            <LockIcon className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs opacity-70">
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                    {item.isPremium && collapsed && (
                      <div className="absolute -top-1 -right-1">
                        <LockIcon className="h-3 w-3 text-amber-500 bg-card rounded-full p-0.5" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Role Badge */}
      {!collapsed && (
        <div className="p-3 border-t">
          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium capitalize">{userRole}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {userCapabilities.length} perms
            </div>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="p-3 border-t">
          <div className="h-8 w-8 mx-auto rounded-full bg-muted flex items-center justify-center">
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </aside>
  );
}
