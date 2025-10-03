// components/org-settings/team/role-permissions-preview.tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Lock, Info } from "lucide-react";
import { useToast } from "@workspace/ui/components/toast";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_CATEGORIES,
  type UserRole,
} from "@/lib/role-permissions-map";

interface RolePermissionsPreviewProps {
  role: UserRole;
  compact?: boolean;
}

export function RolePermissionsPreview({
  role,
  compact = false,
}: RolePermissionsPreviewProps) {
  const { addToast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const rolePermissions = DEFAULT_PERMISSIONS[role];

  // Group permissions by category
  const permissionsByCategory = PERMISSION_CATEGORIES.map((category) => ({
    ...category,
    permissions: rolePermissions.filter((p) => p.category === category.key),
  })).filter((cat) => cat.permissions.length > 0);

  const handleLockedClick = () => {
    addToast(
      "Custom permissions are available on Business & Enterprise plans. Upgrade to customize role permissions.",
      "warning",
      6000
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {rolePermissions.length} permissions included
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>View the full update dialog to see all permissions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-wrap gap-1">
          {permissionsByCategory.slice(0, 3).map((category) => (
            <Badge key={category.key} variant="secondary" className="text-xs">
              {category.name} ({category.permissions.length})
            </Badge>
          ))}
          {permissionsByCategory.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{permissionsByCategory.length - 3} more
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium mb-1">
            Permissions are locked on the Free plan
          </p>
          <p className="text-muted-foreground">
            Upgrade to Business or Enterprise to customize permissions for each
            role. Below is a preview of default permissions for this role.
          </p>
        </div>
      </div>

      {/* Permissions List */}
      <Accordion
        type="multiple"
        value={expandedCategories}
        onValueChange={setExpandedCategories}
        className="space-y-2"
      >
        {permissionsByCategory.map((category) => (
          <AccordionItem
            key={category.key}
            value={category.key}
            className="border rounded-lg px-3"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {category.permissions.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2 pt-2">
                {category.permissions.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group cursor-not-allowed"
                    onClick={handleLockedClick}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 flex-1 cursor-not-allowed">
                            <Checkbox
                              checked={true}
                              disabled
                              className="cursor-not-allowed opacity-50"
                            />
                            <span className="text-sm opacity-60">
                              {permission.name}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="flex items-center gap-2">
                            <Lock className="h-3 w-3" />
                            <span>Upgrade to customize</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Lock className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Footer */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Total: {rolePermissions.length} permissions included with this role
        </p>
      </div>
    </div>
  );
}
