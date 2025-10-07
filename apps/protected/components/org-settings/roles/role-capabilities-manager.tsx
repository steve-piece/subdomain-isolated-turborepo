"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { UserRole } from "@/lib/rbac/permissions";
import { resetRoleToDefaults } from "@actions/rbac";
import {
  batchUpdateRoleCapabilities,
  type CapabilityChange,
} from "@actions/rbac/batch-capabilities";
import { useToast } from "@workspace/ui/components/toast";
import {
  Shield,
  RotateCcw,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Save,
  X as XIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

interface Capability {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  min_role_required?: UserRole; // Added from database migration
}

interface CustomCapability {
  role: UserRole;
  granted: boolean;
  updated_at: string;
  capabilities: Capability;
}

interface RoleCapabilitiesManagerProps {
  allCapabilities: Capability[];
  customCapabilities: CustomCapability[];
  orgId: string;
}

const ROLES: UserRole[] = [
  "owner",
  "superadmin",
  "admin",
  "member",
  "view-only",
];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner:
    "Full administrative control including billing and organization deletion",
  superadmin:
    "Extensive privileges, similar to owner but cannot delete organization",
  admin: "Manage team members, projects, and most organization settings",
  member: "Access projects and collaborate with the team",
  "view-only": "Read-only access to projects and limited settings",
};

// Role hierarchy ranks for determining default access
const ROLE_RANKS: Record<UserRole, number> = {
  "view-only": 0,
  member: 1,
  admin: 2,
  superadmin: 3,
  owner: 4,
};

/**
 * Determines if a role has default access to a capability based on role hierarchy
 * Uses the min_role_required from the database (set during migration)
 */
function hasDefaultAccess(capability: Capability, userRole: UserRole): boolean {
  if (!capability.min_role_required) {
    // Fallback: if no min_role_required, only owner has access
    return userRole === "owner";
  }

  const requiredRank = ROLE_RANKS[capability.min_role_required];
  const userRank = ROLE_RANKS[userRole];

  // Higher or equal rank = access granted
  return userRank >= requiredRank;
}

export function RoleCapabilitiesManager({
  allCapabilities,
  customCapabilities,
}: RoleCapabilitiesManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Get initial role from URL params or default to "member"
  const roleParam = searchParams.get("role") as UserRole | null;
  const initialRole =
    roleParam && ROLES.includes(roleParam) ? roleParam : "member";

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [loading, setLoading] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(
      Object.keys(
        allCapabilities.reduce(
          (acc, cap) => {
            const category = cap.category || "other";
            acc[category] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      ),
    ),
  );

  // Track pending changes before saving
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingChanges.size > 0;

  // Update URL when role changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", selectedRole);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedRole, pathname, router, searchParams]);

  // Warn user about unsaved changes before leaving page
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Clear pending changes when role changes
  useEffect(() => {
    if (pendingChanges.size > 0) {
      const confirmed = window.confirm(
        `You have unsaved changes for the ${selectedRole} role. Discard them?`,
      );
      if (confirmed) {
        setPendingChanges(new Map());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]);

  // Group capabilities by category
  const groupedCapabilities = allCapabilities.reduce(
    (acc, cap) => {
      const category = cap.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      // TypeScript knows acc[category] exists now
      acc[category]!.push(cap);
      return acc;
    },
    {} as Record<string, Capability[]>,
  );

  // Get custom override for a specific capability and role
  const getCustomOverride = (capabilityKey: string, role: UserRole) => {
    return customCapabilities.find(
      (cc) => cc.capabilities?.key === capabilityKey && cc.role === role,
    );
  };

  // Get default state for capability and role (using database min_role_required)
  const getDefaultState = (capabilityKey: string, role: UserRole): boolean => {
    const capability = allCapabilities.find((cap) => cap.key === capabilityKey);
    if (!capability) return false;
    return hasDefaultAccess(capability, role);
  };

  // Get current state (pending changes > custom overrides > defaults)
  const getCurrentState = (capabilityKey: string, role: UserRole): boolean => {
    // Check pending changes first
    if (pendingChanges.has(capabilityKey)) {
      return pendingChanges.get(capabilityKey)!;
    }

    // Then check custom overrides
    const customOverride = getCustomOverride(capabilityKey, role);
    if (customOverride) {
      return customOverride.granted;
    }

    // Finally check defaults
    return getDefaultState(capabilityKey, role);
  };

  // Track toggle as pending change (don't save immediately)
  const handleToggle = (capabilityKey: string, currentState: boolean) => {
    const newState = !currentState;

    setPendingChanges((prev) => {
      const next = new Map(prev);

      // If toggling back to the original state (saved or default), remove from pending
      const customOverride = getCustomOverride(capabilityKey, selectedRole);
      const originalState = customOverride
        ? customOverride.granted
        : getDefaultState(capabilityKey, selectedRole);

      if (newState === originalState) {
        next.delete(capabilityKey);
      } else {
        next.set(capabilityKey, newState);
      }

      return next;
    });
  };

  // Save all pending changes at once
  const handleSave = async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);

    try {
      // Convert pending changes to CapabilityChange format
      const changes: CapabilityChange[] = Array.from(
        pendingChanges.entries(),
      ).map(([capabilityKey, granted]) => ({
        capabilityKey,
        granted,
      }));

      const result = await batchUpdateRoleCapabilities(selectedRole, changes);

      if (result.success) {
        addToast({
          title: "Changes saved",
          description: result.message,
          variant: "success",
          duration: 5000,
        });
        setPendingChanges(new Map()); // Clear pending changes
        router.refresh();
      } else {
        addToast({
          title: "Failed to save changes",
          description: result.message,
          variant: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      addToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel all pending changes
  const handleCancel = () => {
    setPendingChanges(new Map());
    addToast({
      title: "Changes discarded",
      description: "All pending changes have been discarded",
      variant: "info",
      duration: 3000,
    });
  };

  const handleResetRole = async () => {
    setLoading("reset");

    try {
      const result = await resetRoleToDefaults(selectedRole);

      if (result.success) {
        addToast({
          title: "Role reset",
          description: result.message,
          variant: "success",
          duration: 3000,
        });
        router.refresh();
      } else {
        addToast({
          title: "Failed to reset role",
          description: result.message,
          variant: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      addToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setLoading(null);
    }
  };

  // Count customizations for selected role
  const customizationCount = customCapabilities.filter(
    (cc) => cc.role === selectedRole,
  ).length;

  // Toggle section collapse state
  const toggleSection = (category: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Custom Role Capabilities
              </CardTitle>
              <CardDescription className="mt-2">
                Customize what each role can do in your organization. Make your
                changes and click &quot;Save Changes&quot; to apply them. Only
                users with the affected role will be prompted to re-login.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Business Tier
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Default capabilities</strong> are the standard
                  permissions for each role
                </li>
                <li>
                  <strong>Custom overrides</strong> take priority and are marked
                  with a badge
                </li>
                <li>
                  Toggle switches to make changes, then click &quot;Save&quot;
                  to apply
                </li>
                <li>Only users with the modified role will be logged out</li>
                <li>Reset button removes all customizations for a role</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Role to Customize</CardTitle>
          <CardDescription>
            Choose which role you want to modify. Owner role cannot be
            customized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role;
              const isOwner = role === "owner";
              const roleCustomCount = customCapabilities.filter(
                (cc) => cc.role === role,
              ).length;

              return (
                <TooltipProvider key={role}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isOwner && setSelectedRole(role)}
                        disabled={isOwner}
                        className={`relative p-4 rounded-lg border-2 transition-all text-left w-full ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isOwner
                              ? "border-muted bg-muted/30 cursor-not-allowed opacity-60"
                              : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold capitalize mb-1">
                          {role}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {ROLE_DESCRIPTIONS[role]}
                        </div>
                        {roleCustomCount > 0 && !isOwner && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 text-[10px] h-5"
                          >
                            {roleCustomCount} custom
                          </Badge>
                        )}
                        {isOwner && (
                          <div className="absolute top-2 right-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-semibold capitalize mb-1">{role}</p>
                      <p className="text-sm">{ROLE_DESCRIPTIONS[role]}</p>
                      {isOwner && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          Contact support to update the owner role
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {customizationCount > 0 && (
            <div className="mt-4 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{customizationCount}</span> custom
                {customizationCount === 1
                  ? " capability"
                  : " capabilities"} for{" "}
                <span className="font-medium capitalize">{selectedRole}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === "reset"}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Reset {selectedRole} to defaults?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {customizationCount} custom{" "}
                      {customizationCount === 1 ? "capability" : "capabilities"}{" "}
                      and restore the default permissions for this role. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetRole}>
                      Reset to Defaults
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capabilities by Category */}
      {Object.entries(groupedCapabilities).map(([category, caps]) => {
        const isCollapsed = collapsedSections.has(category);
        const capabilitiesInCategory = caps.length;

        return (
          <Card key={category}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    {category}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({capabilitiesInCategory}{" "}
                      {capabilitiesInCategory === 1
                        ? "capability"
                        : "capabilities"}
                      )
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Manage {category}-related permissions for {selectedRole}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-center -space-y-2 text-muted-foreground">
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            {!isCollapsed && (
              <CardContent>
                <div className="space-y-3">
                  {caps.map((capability) => {
                    const defaultState = getDefaultState(
                      capability.key,
                      selectedRole,
                    );
                    const customOverride = getCustomOverride(
                      capability.key,
                      selectedRole,
                    );
                    const currentState = getCurrentState(
                      capability.key,
                      selectedRole,
                    );
                    const isCustomized = customOverride !== undefined;
                    const isLoading = loading === capability.key;
                    const isPending = pendingChanges.has(capability.key);

                    return (
                      <div
                        key={capability.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          isPending
                            ? "bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700"
                            : isCustomized
                              ? "bg-primary/5 border-primary/20"
                              : "bg-background"
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{capability.name}</p>
                            {isPending && (
                              <Badge
                                variant="default"
                                className="text-xs bg-amber-500"
                              >
                                Pending
                              </Badge>
                            )}
                            {isCustomized && !isPending && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                            {currentState ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {capability.description}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <code className="px-2 py-0.5 bg-muted rounded">
                              {capability.key}
                            </code>
                            <span>
                              Default:{" "}
                              {defaultState ? (
                                <span className="text-green-600 font-medium">
                                  Granted
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  Revoked
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <Switch
                          checked={currentState}
                          onCheckedChange={() =>
                            handleToggle(capability.key, currentState)
                          }
                          disabled={isLoading}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Sticky Save/Cancel Buttons */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {pendingChanges.size} unsaved{" "}
                    {pendingChanges.size === 1 ? "change" : "changes"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
