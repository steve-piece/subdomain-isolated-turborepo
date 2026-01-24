// apps/protected/components/projects/project-member-dialog.tsx
// Unified dialog for inviting and managing project members
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useToast } from "@workspace/ui/components/toast";
import { Badge } from "@workspace/ui/components/badge";
import {
  UserPlus,
  Users,
  Loader2,
  Search,
  X,
  Edit,
  Trash2,
  Shield,
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

type Permission = "read" | "write" | "admin";

interface ProjectMemberDialogProps {
  projectId: string;
  subdomain: string;
  isOwner: boolean;
  canManageMembers: boolean;
  // For general use (both tabs)
  mode?: "invite" | "manage";
  trigger?: React.ReactNode;
  // For direct member management
  memberId?: string;
  memberName?: string;
  currentPermission?: Permission;
}

export function ProjectMemberDialog({
  projectId,
  subdomain,
  canManageMembers,
  mode: initialMode = "invite",
  trigger,
  memberId,
  memberName,
  currentPermission,
}: ProjectMemberDialogProps) {
  const claims = useTenantClaims();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "manage">(initialMode);

  // Invite state
  const [availableMembers, setAvailableMembers] = useState<
    AvailableOrgMember[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [invitePermission, setInvitePermission] = useState<Permission>("read");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Manage state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editPermission, setEditPermission] = useState<Permission>("read");
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [operationPending, setOperationPending] = useState<string | null>(null);

  // Determine if we should show tabs or single view
  const showTabs = !memberId && !currentPermission;

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
      if (currentPermission) {
        setEditPermission(currentPermission);
        setActiveTab("manage");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPermission]);

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
    } catch {
      addToast({
        title: "Error",
        description: "Failed to load member data",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, addToast]);

  // Handle invite submission
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setInviteLoading(true);
    try {
      const result = await grantProjectPermission(
        projectId,
        selectedUserId,
        invitePermission,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setSelectedUserId("");
        setInvitePermission("read");
        await loadData();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to add member",
        variant: "error",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle permission update
  const handleUpdatePermission = async (
    userId: string,
    permission: Permission,
  ) => {
    setOperationPending(userId);
    startTransition(async () => {
      const result = await updateProjectPermission(
        projectId,
        userId,
        permission,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setEditingMemberId(null);
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

  // Handle member removal
  const handleRemoveMember = async (userId: string) => {
    setOperationPending(userId);
    startTransition(async () => {
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
    (member) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const canModifyMember = (member: ProjectMember) => {
    if (!canManageMembers) return false;
    if (member.user_id === claims.user_id) return false;
    if (member.is_owner) return false;
    return true;
  };

  const permissionColors: Record<Permission, string> = {
    read: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    write: "bg-green-500/10 text-green-500 border-green-500/20",
    admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const permissionLabels: Record<Permission, string> = {
    read: "Read Only",
    write: "Can Edit",
    admin: "Admin",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Manage Members
          </Button>
        )}
      </DialogTrigger>

      {/* Fixed size dialog content */}
      <DialogContent className="sm:max-w-[700px] min-h-[500px] flex flex-col">
        {showTabs ? (
          // Tabbed interface for general dialog
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "invite" | "manage")}
            className="flex-1 flex flex-col"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Members
              </DialogTitle>
              <DialogDescription>
                Add new members or manage existing project members
              </DialogDescription>
            </DialogHeader>

            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Members
              </TabsTrigger>
            </TabsList>

            {/* Invite Tab */}
            <TabsContent value="invite" className="flex-1 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No organization members available to add.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All team members have already been added to this project.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="user">Team Member</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                      disabled={inviteLoading}
                    >
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Select a member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((member) => (
                          <SelectItem
                            key={member.user_id}
                            value={member.user_id}
                          >
                            {member.full_name || member.email} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="permission">Permission Level</Label>
                    <Select
                      value={invitePermission}
                      onValueChange={(value) =>
                        setInvitePermission(value as Permission)
                      }
                      disabled={inviteLoading}
                    >
                      <SelectTrigger id="permission">
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">
                          Read Only - Can view project
                        </SelectItem>
                        <SelectItem value="write">
                          Can Edit - Can modify content
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin - Full project control
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={inviteLoading || !selectedUserId}
                    >
                      {inviteLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={inviteLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="flex-1 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Members List */}
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {filteredMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No members found
                        </p>
                      ) : (
                        filteredMembers.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {member.full_name || member.email}
                                  {member.user_id === claims.user_id &&
                                    " (You)"}
                                </p>
                                {member.is_owner && (
                                  <Badge
                                    variant="secondary"
                                    className="flex-shrink-0"
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    Owner
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {editingMemberId === member.user_id ? (
                                <>
                                  <Select
                                    value={editPermission}
                                    onValueChange={(value) =>
                                      setEditPermission(value as Permission)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
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
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleUpdatePermission(
                                        member.user_id,
                                        editPermission,
                                      )
                                    }
                                    disabled={
                                      operationPending === member.user_id ||
                                      editPermission === member.permission
                                    }
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingMemberId(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Badge
                                    className={
                                      permissionColors[
                                        member.permission as Permission
                                      ]
                                    }
                                  >
                                    {
                                      permissionLabels[
                                        member.permission as Permission
                                      ]
                                    }
                                  </Badge>
                                  {canModifyMember(member) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingMemberId(member.user_id);
                                          const perm =
                                            member.permission as Permission;
                                          setEditPermission(perm);
                                        }}
                                        disabled={
                                          operationPending === member.user_id
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleRemoveMember(member.user_id)
                                        }
                                        disabled={
                                          operationPending === member.user_id
                                        }
                                      >
                                        {operationPending === member.user_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Single mode for direct member management (not currently used but available)
          <>
            <DialogHeader>
              <DialogTitle>Update Member Permission</DialogTitle>
              <DialogDescription>
                Change the permission level for {memberName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-permission">Permission Level</Label>
                <Select
                  value={editPermission}
                  onValueChange={(value) =>
                    setEditPermission(value as Permission)
                  }
                >
                  <SelectTrigger id="edit-permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="write">Can Edit</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  memberId && handleUpdatePermission(memberId, editPermission)
                }
                disabled={
                  !memberId ||
                  operationPending === memberId ||
                  editPermission === currentPermission
                }
                className="flex-1"
              >
                {operationPending === memberId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Permission"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
