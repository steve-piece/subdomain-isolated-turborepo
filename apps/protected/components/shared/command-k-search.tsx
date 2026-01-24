"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  Home,
  Users,
  Building2,
  CreditCard,
  Bell,
  User,
  Lock,
  LayoutDashboard,
  ShieldCheck,
  Search,
  Folder,
  Crown,
  Command,
} from "lucide-react";
import type { AppRole } from "../../lib/types";
import { hasRoleAccess } from "../../lib/utils/role-hierarchy";

interface NavigationItem {
  title: string;
  href: string;
  icon: typeof Home;
  description: string;
  requiredCapabilities?: string[];
  requiredRoles?: AppRole[];
  isPremium?: boolean;
  group: string;
}

interface CommandKSearchProps {
  userRole?: AppRole;
  userCapabilities?: string[];
  subdomain: string;
}

// Define navigation structure matching the sidebar
const getAllNavigationItems = (): NavigationItem[] => {
  return [
    // Main
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Overview and quick actions",
      group: "Main",
    },
    {
      title: "Projects",
      href: "/projects",
      icon: Folder,
      description: "Manage your projects",
      requiredCapabilities: ["projects.view"],
      group: "Main",
    },
    {
      title: "Admin Panel",
      href: "/admin",
      icon: LayoutDashboard,
      description: "Organization management",
      requiredRoles: ["owner", "admin", "superadmin"],
      requiredCapabilities: ["org.settings.view"],
      group: "Main",
    },
    // Organization
    {
      title: "General Settings",
      href: "/org-settings",
      icon: Building2,
      description: "Company details",
      requiredRoles: ["owner", "admin", "superadmin"],
      requiredCapabilities: ["org.settings.view"],
      group: "Organization",
    },
    {
      title: "Team",
      href: "/org-settings/team",
      icon: Users,
      description: "Manage members",
      requiredRoles: ["owner", "admin", "superadmin"],
      requiredCapabilities: ["team.view"],
      group: "Organization",
    },
    {
      title: "Roles",
      href: "/org-settings/roles",
      icon: ShieldCheck,
      description: "Custom permissions",
      requiredRoles: ["owner"],
      requiredCapabilities: ["org.settings.view"],
      isPremium: true,
      group: "Organization",
    },
    {
      title: "Billing",
      href: "/org-settings/billing",
      icon: CreditCard,
      description: "Plans & invoices",
      requiredRoles: ["owner", "admin"],
      requiredCapabilities: ["billing.view"],
      isPremium: true,
      group: "Organization",
    },
    // User Settings
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      description: "Personal information",
      requiredCapabilities: ["profile.edit_own"],
      group: "Settings",
    },
    {
      title: "Security",
      href: "/security",
      icon: Lock,
      description: "Password & 2FA",
      requiredCapabilities: ["security.view_own"],
      group: "Settings",
    },
    {
      title: "Notifications",
      href: "/notifications",
      icon: Bell,
      description: "Email & alerts",
      requiredCapabilities: ["notifications.edit_own"],
      group: "Settings",
    },
  ];
};

export function CommandKSearch({
  userRole = "member",
  userCapabilities = [],
  subdomain,
}: CommandKSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Check if user has access to a navigation item
  const hasAccess = React.useCallback(
    (item: NavigationItem): boolean => {
      // Check role requirements
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        if (!hasRoleAccess(userRole, item.requiredRoles)) {
          return false;
        }
      }

      // Check capability requirements
      if (item.requiredCapabilities && item.requiredCapabilities.length > 0) {
        const hasAllCapabilities = item.requiredCapabilities.every((cap) =>
          userCapabilities.includes(cap),
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    },
    [userRole, userCapabilities],
  );

  // Get accessible items
  const allItems = getAllNavigationItems();
  const accessibleItems = allItems.filter(hasAccess);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) {
      return accessibleItems;
    }

    const query = search.toLowerCase();
    return accessibleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query),
    );
  }, [search, accessibleItems]);

  // Reset selected index when filtered items change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem) {
        handleSelect(selectedItem);
      }
    }
  };

  // Handle item selection
  const handleSelect = (item: NavigationItem) => {
    const fullPath = `/s/${subdomain}${item.href}`;
    router.push(fullPath);
    setOpen(false);
    setSearch("");
    setSelectedIndex(0);
  };

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, NavigationItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group]!.push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <>
      {/* Trigger button - hidden, only accessible via keyboard */}
      <button
        onClick={() => setOpen(true)}
        className="hidden"
        aria-label="Open command palette"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-0 pr-12">
            <DialogTitle className="flex items-center gap-2 text-base font-normal">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quick Search</span>
              <div className="ml-auto flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <Command className="h-3 w-3" />K
                </kbd>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-3">
            <Input
              ref={inputRef}
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10"
            />
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="px-2 pb-4">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                Object.entries(groupedItems).map(([group, items]) => (
                  <div key={group} className="mb-4">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const globalIndex = filteredItems.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;
                        const isActive =
                          pathname === `/s/${subdomain}${item.href}`;

                        return (
                          <button
                            key={item.href}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-sm transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              isSelected && "bg-accent text-accent-foreground",
                              isActive && "bg-primary/10 text-primary",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.title}
                                </span>
                                {item.isPremium && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 px-1.5 text-[10px]"
                                  >
                                    <Crown className="h-3 w-3 mr-0.5" />
                                    Pro
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Navigate with ↑↓ • Select with ↵</span>
              <span>
                Close with <kbd className="rounded bg-muted px-1">Esc</kbd>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
