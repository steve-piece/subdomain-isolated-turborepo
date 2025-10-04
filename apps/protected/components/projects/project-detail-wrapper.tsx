// apps/protected/components/projects/project-detail-wrapper.tsx
/**
 * ✅ PHASE 2: Refactored project detail wrapper - centralized auth
 * - Fetches own data using useTenantClaims
 * - No props needed from page except identifiers
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { InviteToProjectDialog } from "./invite-to-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ManagePermissionDialog } from "./manage-permission-dialog";
import { revokeProjectPermission, leaveProject } from "@actions/projects";
import { useToast } from "@workspace/ui/components/toast";
import {
  ArrowLeft,
  Folder,
  Users,
  Calendar,
  Shield,
  X,
  Archive,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState, useTransition, useEffect } from "react";

interface ProjectMember {
  user_id: string;
  full_name: string | null;
  email: string;
  permission_level: string;
  granted_at: string;
}

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  owner_id: string;
  org_id: string;
}

interface ProjectDetailWrapperProps {
  subdomain: string;
  projectId: string;
}

export function ProjectDetailWrapper({
  subdomain,
  projectId,
}: ProjectDetailWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const { addToast } = useToast();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [userPermission, setUserPermission] = useState<
    "read" | "write" | "admin" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isLeaving, startLeavingTransition] = useTransition();

  // Fetch project data
  useEffect(() => {
    async function fetchProjectData() {
      try {
        // Fetch project details
        const { data: projectData } = await supabase
          .from("projects")
          .select("id, name, description, created_at, owner_id, org_id")
          .eq("id", projectId)
          .eq("status", "active")
          .single();

        if (!projectData || projectData.org_id !== claims.org_id) {
          router.push("/projects");
          return;
        }

        setProject(projectData);

        // Fetch project members with their details
        const { data: permissions } = await supabase
          .from("project_permissions")
          .select(
            `
            user_id,
            permission_level,
            granted_at,
            user_profiles!inner (
              full_name,
              email
            )
          `,
          )
          .eq("project_id", projectId);

        const projectMembers =
          permissions?.map(
            (perm: {
              user_id: string;
              permission_level: string;
              granted_at: string;
              user_profiles:
                | { full_name?: string; email: string }
                | { full_name?: string; email: string }[];
            }) => {
              const profile = Array.isArray(perm.user_profiles)
                ? perm.user_profiles[0]
                : perm.user_profiles;
              return {
                user_id: perm.user_id,
                full_name: profile?.full_name || null,
                email: profile?.email || "",
                permission_level: perm.permission_level,
                granted_at: perm.granted_at,
              };
            },
          ) || [];

        setMembers(projectMembers);

        // Get current user's permission level
        const userPerm = projectMembers.find(
          (m) => m.user_id === claims.user_id,
        );
        setUserPermission(
          (userPerm?.permission_level as "read" | "write" | "admin") || null,
        );

        // Fetch all org members for invite dialog
        const { data: allOrgMembers } = await supabase
          .from("user_profiles")
          .select("user_id, full_name, email, role")
          .eq("org_id", claims.org_id);

        setOrgMembers(allOrgMembers || []);
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        router.push("/projects");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjectData();
  }, [projectId, claims.org_id, claims.user_id, supabase, router]);

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);

    try {
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
        // Update local state
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
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
        description: "Failed to remove member",
        variant: "error",
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleLeave = () => {
    startLeavingTransition(async () => {
      const result = await leaveProject(projectId, subdomain);
      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        router.push(`/s/${subdomain}/projects`);
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    });
  };

  if (isLoading || !project) {
    return <div className="p-6">Loading project...</div>;
  }

  const canManageMembers = userPermission === "admin";
  const isOwner = claims.user_id === project.owner_id;
  const currentMemberIds = members.map((m) => m.user_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Folder className="h-8 w-8" />
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(project.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
          </div>
          {!isOwner && userPermission && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Project
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Project Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Members
          </CardTitle>
          {canManageMembers && (
            <InviteToProjectDialog
              projectId={projectId}
              subdomain={subdomain}
              orgMembers={orgMembers}
              currentMembers={currentMemberIds}
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {member.full_name || member.email}
                    {member.user_id === claims.user_id && " (you)"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">
                      {member.permission_level}
                    </span>
                  </div>
                </div>
                {canManageMembers && member.user_id !== claims.user_id && (
                  <div className="flex items-center gap-2">
                    <ManagePermissionDialog
                      projectId={projectId}
                      subdomain={subdomain}
                      userId={member.user_id}
                      userName={member.full_name || member.email}
                      currentPermission={
                        member.permission_level as "read" | "write" | "admin"
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={removingUserId === member.user_id}
                    >
                      {removingUserId === member.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Archive Project</p>
                <p className="text-sm text-muted-foreground">
                  Archive this project (can be restored later)
                </p>
              </div>
              <DeleteProjectDialog
                projectId={projectId}
                projectName={project.name}
                subdomain={subdomain}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
