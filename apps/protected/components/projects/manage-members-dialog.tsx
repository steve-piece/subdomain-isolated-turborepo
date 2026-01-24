// apps/protected/components/projects/manage-members-dialog.tsx
"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useToast } from "@workspace/ui/components/toast";
import { Badge } from "@workspace/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  Users,
  Search,
  UserPlus,
  X,
  Shield,
  Loader2,
  Trash2,
  Edit,
} from "lucide-react";
import {
  getProjectMembers,
  getAvailableOrgMembers,
  grantProjectPermission,
  updateProjectPermission,
  revokeProjectPermission,
  type ProjectMember,
  type AvailableOrgMember,
} from "@actions/projects";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ManageMembersDialogProps {
  projectId: string;
  subdomain: string;
  isOwner: boolean;
  canManageMembers: boolean;
}

export function ManageMembersDialog({
  projectId,
  subdomain,
  isOwner,
  canManageMembers,
}: ManageMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<
    AvailableOrgMember[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addMemberView, setAddMemberView] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<
    "read" | "write" | "admin"
  >("read");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editPermission, setEditPermission] = useState<
    "read" | "write" | "admin"
  >("read");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [operationPending, setOperationPending] = useState<string | null>(null);

  const { addToast } = useToast();
  const claims = useTenantClaims();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, availableRes] = await Promise.all([
        getProjectMembers(projectId),
        getAvailableOrgMembers(projectId),
      ]);

      if (membersRes.success && membersRes.members) {
        setMembers(membersRes.members);
      }

      if (availableRes.success && availableRes.members) {
        setAvailableMembers(availableRes.members);
      }
    } catch (error) {
      console.error("Failed to load member data:", error);
      addToast({
        title: "Error",
        description: "Failed to load member data",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, addToast]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMemberDropdown(false);
      }
    };

    if (showMemberDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMemberDropdown]);

  const handleAddMember = () => {
    if (!selectedMember) return;

    startTransition(async () => {
      setOperationPending(selectedMember);
      const result = await grantProjectPermission(
        projectId,
        selectedMember,
        selectedPermission,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        await loadData();
        setSelectedMember(null);
        setAddMemberView(false);
        setShowMemberDropdown(false);
        setSearchQuery("");
        setSelectedPermission("read"); // Reset to default
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
      setOperationPending(null);
    });
  };

  const handleUpdatePermission = (userId: string) => {
    startTransition(async () => {
      setOperationPending(userId);
      const result = await updateProjectPermission(
        projectId,
        userId,
        editPermission,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        await loadData();
        setEditingMemberId(null);
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
      setOperationPending(null);
    });
  };

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      setOperationPending(userId);
      const result = await revokeProjectPermission(
        projectId,
        userId,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        await loadData();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
      setOperationPending(null);
    });
  };

  const filteredMembers = members.filter(
    (member: ProjectMember) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredAvailableMembers = availableMembers.filter(
    (member: AvailableOrgMember) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const permissionColors = {
    read: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    write: "bg-green-500/10 text-green-500 border-green-500/20",
    admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Project Members
          </DialogTitle>
          <DialogDescription>
            Add, remove, or edit permissions for project members
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add Member Section - only show when in add mode and has permission */}
            {addMemberView && canManageMembers ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddMemberView(false);
                      setSearchQuery("");
                      setShowMemberDropdown(false);
                      setSelectedMember(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Add a member to this project
                  </div>
                </div>

                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      placeholder="Search organization members to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowMemberDropdown(true)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>

                  {/* Dropdown with available members */}
                  {showMemberDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-2 border rounded-lg bg-background shadow-lg"
                    >
                      <ScrollArea className="max-h-[300px]">
                        <div className="p-2 space-y-1">
                          {filteredAvailableMembers.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                              {availableMembers.length === 0
                                ? "All organization members have been added"
                                : "No members found matching your search"}
                            </div>
                          ) : (
                            filteredAvailableMembers.map(
                              (member: AvailableOrgMember) => (
                                <div
                                  key={member.user_id}
                                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                                    selectedMember === member.user_id
                                      ? "bg-primary/10 border border-primary"
                                      : "hover:bg-muted"
                                  }`}
                                  onClick={() => {
                                    if (selectedMember === member.user_id) {
                                      setSelectedMember(null);
                                    } else {
                                      setSelectedMember(member.user_id);
                                    }
                                  }}
                                >
                                  <div className="flex-1 min-w-0 mr-3">
                                    <p className="font-medium text-sm truncate">
                                      {member.full_name || member.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.email}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="mt-1.5 text-xs"
                                    >
                                      {member.role}
                                    </Badge>
                                  </div>
                                  {selectedMember === member.user_id && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Select
                                        value={selectedPermission}
                                        onValueChange={(value) =>
                                          setSelectedPermission(
                                            value as "read" | "write" | "admin",
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-[100px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="read">
                                            Read
                                          </SelectItem>
                                          <SelectItem value="write">
                                            Write
                                          </SelectItem>
                                          <SelectItem value="admin">
                                            Admin
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddMember();
                                        }}
                                        disabled={isPending}
                                        size="sm"
                                        className="h-8"
                                      >
                                        {operationPending === member.user_id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          "Add"
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ),
                            )
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                {selectedMember && (
                  <div className="text-xs text-muted-foreground">
                    💡 Select a permission level and click &quot;Add&quot; to
                    add the member
                  </div>
                )}
              </div>
            ) : (
              /* View/Manage existing members */
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search current members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {canManageMembers && (
                    <Button
                      onClick={() => {
                        setAddMemberView(true);
                        setSearchQuery("");
                        setShowMemberDropdown(true);
                      }}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Current Members List */}
            {!addMemberView && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {filteredMembers.length === 0 ? (
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Users />
                        </EmptyMedia>
                        <EmptyTitle>No Members Found</EmptyTitle>
                        <EmptyDescription>
                          {searchQuery
                            ? "No members match your search criteria. Try a different search term."
                            : "This project doesn't have any members yet. Add members to collaborate."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <>
                      {filteredMembers.map((member: ProjectMember) => {
                        const isCurrentUser = member.user_id === claims.user_id;
                        const isMemberOwner = isOwner && isCurrentUser;
                        const isEditing = editingMemberId === member.user_id;

                        return (
                          <div
                            key={member.user_id}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">
                                  {member.full_name || member.email}
                                </p>
                                {isCurrentUser && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                                    you
                                  </span>
                                )}
                                {isMemberOwner && (
                                  <span className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                    owner
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate mb-2">
                                {member.email}
                              </p>
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <Select
                                    value={editPermission}
                                    onValueChange={(value) =>
                                      setEditPermission(
                                        value as "read" | "write" | "admin",
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="read">Read</SelectItem>
                                      <SelectItem value="write">
                                        Write
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        Admin
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={
                                      permissionColors[
                                        member.permission as keyof typeof permissionColors
                                      ]
                                    }
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    {member.permission}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {canManageMembers &&
                              !isCurrentUser &&
                              !isMemberOwner && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        onClick={() =>
                                          handleUpdatePermission(member.user_id)
                                        }
                                        disabled={
                                          isPending ||
                                          editPermission === member.permission
                                        }
                                        size="sm"
                                      >
                                        {operationPending === member.user_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          "Save"
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() => setEditingMemberId(null)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => {
                                          setEditingMemberId(member.user_id);
                                          setEditPermission(member.permission);
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        title="Edit permissions"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          handleRemoveMember(member.user_id)
                                        }
                                        disabled={isPending}
                                        variant="ghost"
                                        size="icon"
                                        title="Remove member"
                                      >
                                        {operationPending === member.user_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        )}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Member Count Summary - always visible */}
            <div className="pt-4 border-t">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {members.length}
                  </span>
                  <span>
                    total {members.length === 1 ? "member" : "members"}
                  </span>
                </div>
                {!addMemberView && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">
                        {availableMembers.length}
                      </span>
                      <span>available to add</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
