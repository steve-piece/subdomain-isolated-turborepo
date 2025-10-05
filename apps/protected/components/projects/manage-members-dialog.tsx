// apps/protected/components/projects/manage-members-dialog.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
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

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
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
  };

  const handleAddMember = () => {
    if (!selectedMember) return;

    startTransition(async () => {
      setOperationPending(selectedMember);
      const result = await grantProjectPermission(
        projectId,
        selectedMember,
        selectedPermission,
        subdomain
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
        subdomain
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
        subdomain
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
    (member) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableMembers = availableMembers.filter(
    (member) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
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
      <DialogContent className="max-w-2xl max-h-[80vh]">
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
            {/* Search and Add Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canManageMembers && (
                <Button
                  variant={addMemberView ? "secondary" : "default"}
                  onClick={() => {
                    setAddMemberView(!addMemberView);
                    setSearchQuery("");
                  }}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {addMemberView ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </>
                  )}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {addMemberView ? (
                /* Add Member View */
                <div className="space-y-3">
                  {filteredAvailableMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {availableMembers.length === 0
                        ? "All organization members have been added to this project"
                        : "No members found"}
                    </div>
                  ) : (
                    <>
                      {filteredAvailableMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg transition-all ${
                            selectedMember === member.user_id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {member.full_name || member.email}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.email}
                            </p>
                            <Badge
                              variant="outline"
                              className="mt-2 text-xs inline-flex"
                            >
                              Org Role: {member.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {selectedMember === member.user_id && (
                              <Select
                                value={selectedPermission}
                                onValueChange={(value) =>
                                  setSelectedPermission(
                                    value as "read" | "write" | "admin"
                                  )
                                }
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="read">Read</SelectItem>
                                  <SelectItem value="write">Write</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {selectedMember === member.user_id ? (
                              <Button
                                onClick={handleAddMember}
                                disabled={isPending}
                                size="sm"
                                className="min-w-[60px]"
                              >
                                {operationPending === member.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Add"
                                )}
                              </Button>
                            ) : (
                              <Button
                                onClick={() =>
                                  setSelectedMember(member.user_id)
                                }
                                variant="outline"
                                size="sm"
                                className="min-w-[60px]"
                              >
                                Select
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                /* Current Members View */
                <div className="space-y-3">
                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No members found
                    </div>
                  ) : (
                    <>
                      {filteredMembers.map((member) => {
                        const isCurrentUser = member.user_id === claims.user_id;
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
                                        value as "read" | "write" | "admin"
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
                                      permissionColors[member.permission_level]
                                    }
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    {member.permission_level}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {canManageMembers && !isCurrentUser && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isEditing ? (
                                  <>
                                    <Button
                                      onClick={() =>
                                        handleUpdatePermission(member.user_id)
                                      }
                                      disabled={
                                        isPending ||
                                        editPermission ===
                                          member.permission_level
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
                                        setEditPermission(
                                          member.permission_level
                                        );
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
              )}
            </ScrollArea>

            {/* Member Count Summary */}
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
                <span className="text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {availableMembers.length}
                  </span>
                  <span>available to add</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
