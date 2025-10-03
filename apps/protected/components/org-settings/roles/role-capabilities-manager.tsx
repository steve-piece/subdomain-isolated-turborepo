"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { UserRole } from "@/lib/rbac/permissions";
import {
  grantCustomCapability,
  revokeCustomCapability,
  resetRoleToDefaults,
} from "@actions/rbac";
import { useToast } from "@workspace/ui/components/toast";
import { Shield, RotateCcw, Info, CheckCircle2, XCircle } from "lucide-react";
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

// Default capabilities by role (from RBAC_QUICK_REFERENCE.md)
const DEFAULT_CAPABILITIES: Record<string, UserRole[]> = {
  "projects.create": ["owner", "superadmin", "admin", "member"],
  "projects.view_all": ["owner", "superadmin", "admin"],
  "projects.view_own": ["owner", "superadmin", "admin", "member", "view-only"],
  "projects.edit_all": ["owner", "superadmin", "admin"],
  "projects.edit_own": ["owner", "superadmin", "admin", "member"],
  "projects.delete_all": ["owner", "superadmin", "admin"],
  "team.invite": ["owner", "superadmin", "admin"],
  "team.remove": ["owner", "superadmin", "admin"],
  "team.view": ["owner", "superadmin", "admin", "member", "view-only"],
  "team.manage_roles": ["owner", "superadmin", "admin"],
  "billing.view": ["owner", "superadmin", "admin"],
  "billing.manage": ["owner", "admin"],
  "org.settings.view": ["owner", "superadmin", "admin"],
  "org.settings.edit": ["owner", "superadmin", "admin"],
  "org.settings.delete": ["owner"],
  "profile.edit_own": ["owner", "superadmin", "admin", "member"],
  "profile.edit_others": ["owner", "superadmin"],
  "security.view_own": ["owner", "superadmin", "admin", "member", "view-only"],
  "security.edit_own": ["owner", "superadmin", "admin", "member"],
  "security.view_org_audit": ["owner", "superadmin", "admin"],
  "notifications.edit_own": ["owner", "superadmin", "admin", "member"],
};

export function RoleCapabilitiesManager({
  allCapabilities,
  customCapabilities,
}: RoleCapabilitiesManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { addToast } = useToast();

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
    {} as Record<string, Capability[]>
  );

  // Get custom override for a specific capability and role
  const getCustomOverride = (capabilityKey: string, role: UserRole) => {
    return customCapabilities.find(
      (cc) => cc.capabilities?.key === capabilityKey && cc.role === role
    );
  };

  // Get default state for capability and role
  const getDefaultState = (capabilityKey: string, role: UserRole): boolean => {
    return DEFAULT_CAPABILITIES[capabilityKey]?.includes(role) || false;
  };

  // Get current state (custom overrides default)
  const getCurrentState = (capabilityKey: string, role: UserRole): boolean => {
    const customOverride = getCustomOverride(capabilityKey, role);
    if (customOverride) {
      return customOverride.granted;
    }
    return getDefaultState(capabilityKey, role);
  };

  const handleToggle = async (capabilityKey: string, currentState: boolean) => {
    setLoading(capabilityKey);

    try {
      const result = currentState
        ? await revokeCustomCapability(selectedRole, capabilityKey)
        : await grantCustomCapability(selectedRole, capabilityKey);

      if (result.success) {
        addToast({
          title: "Capability updated",
          description: result.message,
          variant: "success",
          duration: 3000,
        });
        router.refresh();
      } else {
        addToast({
          title: "Failed to update capability",
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
    (cc) => cc.role === selectedRole
  ).length;

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
                Customize what each role can do in your organization. Changes
                apply immediately to all users with the selected role.
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
                <li>Toggle switches grant or revoke specific capabilities</li>
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
                (cc) => cc.role === role
              ).length;

              return (
                <button
                  key={role}
                  onClick={() => !isOwner && setSelectedRole(role)}
                  disabled={isOwner}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : isOwner
                        ? "border-muted bg-muted/30 cursor-not-allowed opacity-60"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold capitalize mb-1">{role}</div>
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
                    <Badge
                      variant="outline"
                      className="absolute top-2 right-2 text-[10px] h-5"
                    >
                      Locked
                    </Badge>
                  )}
                </button>
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
      {Object.entries(groupedCapabilities).map(([category, caps]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg capitalize">{category}</CardTitle>
            <CardDescription>
              Manage {category}-related permissions for {selectedRole}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caps.map((capability) => {
                const defaultState = getDefaultState(
                  capability.key,
                  selectedRole
                );
                const customOverride = getCustomOverride(
                  capability.key,
                  selectedRole
                );
                const currentState = getCurrentState(
                  capability.key,
                  selectedRole
                );
                const isCustomized = customOverride !== undefined;
                const isLoading = loading === capability.key;

                return (
                  <div
                    key={capability.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isCustomized
                        ? "bg-primary/5 border-primary/20"
                        : "bg-background"
                    }`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{capability.name}</p>
                        {isCustomized && (
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
        </Card>
      ))}
    </div>
  );
}
