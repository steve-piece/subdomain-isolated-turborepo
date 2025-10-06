"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { UserPlus, Users, Shield, Lock } from "lucide-react";
import { InviteUserDialog } from "@/components/shared/invite-user-dialog";
import { UpdateRoleDialog } from "./update-role-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { TeamSettingsConfig } from "./team-settings-config";
import { PendingInvitationsList } from "./pending-invitations-list";

type UserRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  role: UserRole;
  email: string;
}

interface TeamSettingsWrapperProps {
  subdomain: string;
}

export function TeamSettingsWrapper({ subdomain }: TeamSettingsWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const supabase = createClient();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=unauthorized");
    }
  }, [claims.user_role, router]);

  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("org_id", claims.org_id);

        setTeamMembers(data || []);
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, [claims.org_id, supabase]);

  // Show loading or access denied
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Team Settings Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-40 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-5 bg-muted rounded animate-pulse w-48" />
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Members Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 bg-muted rounded animate-pulse w-32 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse w-56" />
              </div>
              <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-32" />
                      <div className="h-3 bg-muted rounded animate-pulse w-48" />
                    </div>
                  </div>
                  <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to determine if current user can modify target user
  const canModifyUser = (targetRole: UserRole): boolean => {
    const currentRole = claims.user_role as UserRole;

    if (currentRole === "owner") return true;
    if (currentRole === "superadmin") {
      return !["owner", "superadmin"].includes(targetRole);
    }
    if (currentRole === "admin") {
      return ["member", "view-only"].includes(targetRole);
    }
    return false;
  };

  // Helper to get role badge variant
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "owner":
        return "default";
      case "superadmin":
        return "secondary";
      case "admin":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Settings Configuration */}
      <TeamSettingsConfig />

      {/* Pending Invitations */}
      <PendingInvitationsList orgId={claims.org_id} subdomain={subdomain} />

      {/* Custom Roles Feature (Locked) */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Custom Roles & Permissions
          </CardTitle>
          <CardDescription>
            Create custom roles with granular permissions for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">
                Available on Business & Enterprise plans
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Unlock advanced permission management with custom roles tailored
                to your organization&apos;s needs.
              </p>
              <Button variant="outline" size="sm">
                View Plans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </div>
          <InviteUserDialog
            subdomain={subdomain}
            trigger={
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members yet. Invite your first team member!
              </p>
            ) : (
              teamMembers.map((member) => {
                const isCurrentUser = member.user_id === claims.user_id;
                const canModify = canModifyUser(member.role) && !isCurrentUser;

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {member.full_name || "No name"}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-2">
                              (You)
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <Badge
                          variant={getRoleBadgeVariant(member.role)}
                          className="capitalize"
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Role Management Actions */}
                    {canModify && (
                      <div className="flex items-center gap-1">
                        <UpdateRoleDialog
                          userId={member.user_id}
                          userName={member.full_name || member.email}
                          currentRole={member.role}
                          orgId={claims.org_id}
                        />
                        <DeleteUserDialog
                          userId={member.user_id}
                          userName={member.full_name || member.email}
                          userEmail={member.email}
                          orgId={claims.org_id}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
