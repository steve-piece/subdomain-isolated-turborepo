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
import { createClient } from "@workspace/supabase/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ProjectMemberDialog } from "./project-member-dialog";
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

        // Fetch project permissions first
        const { data: permissions } = await supabase
          .from("project_permissions")
          .select("user_id, permission_level, granted_at")
          .eq("project_id", projectId);

        // Then fetch user profiles for those users
        const userIds = permissions?.map((p) => p.user_id) || [];
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        // Combine permissions with profiles
        const projectMembers =
          permissions?.map((perm) => {
            const profile = profiles?.find((p) => p.user_id === perm.user_id);
            return {
              user_id: perm.user_id,
              full_name: profile?.full_name || null,
              email: profile?.email || "Unknown",
              permission_level: perm.permission_level,
              granted_at: perm.granted_at,
            };
          }) || [];

        setMembers(projectMembers);

        // Get current user's permission level
        const userPerm = projectMembers.find(
          (m) => m.user_id === claims.user_id,
        );
        setUserPermission(
          (userPerm?.permission_level as "read" | "write" | "admin") || null,
        );
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
    return (
      <div className="flex flex-col h-full p-6 max-w-7xl mx-auto w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-9 bg-muted rounded-lg animate-pulse w-64" />
            <div className="h-4 bg-muted rounded animate-pulse w-96" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24" />
                <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse w-16 mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse w-40 mb-2" />
              <div className="h-4 bg-muted rounded animate-pulse w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse w-40 mb-2" />
              <div className="h-4 bg-muted rounded animate-pulse w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canManageMembers = userPermission === "admin";
  const isOwner = claims.user_id === project.owner_id;

  return (
    <div className="flex flex-col h-full p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Back Navigation */}
      <div className="flex-shrink-0">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <Folder className="h-8 w-8 flex-shrink-0 text-primary" />
            <h1 className="text-3xl font-bold break-words">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
          </div>
        </div>
        {!isOwner && userPermission && (
          <div className="flex-shrink-0 lg:self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              disabled={isLeaving}
              className="w-full lg:w-auto"
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
          </div>
        )}
      </div>

      {/* Project Members */}
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0" />
              Project Members
            </CardTitle>
            {canManageMembers && (
              <ProjectMemberDialog
                projectId={projectId}
                subdomain={subdomain}
                isOwner={isOwner}
                canManageMembers={canManageMembers}
                mode="invite"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {member.full_name || member.email}
                    </p>
                    {member.user_id === claims.user_id && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                        you
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground capitalize">
                        {member.permission_level}
                      </span>
                    </div>
                  </div>
                </div>
                {canManageMembers && member.user_id !== claims.user_id && (
                  <div className="flex items-center gap-2 flex-shrink-0 sm:self-center">
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
        <Card className="border-destructive flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Archive className="h-5 w-5 flex-shrink-0" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive mb-1">
                  Archive Project
                </p>
                <p className="text-sm text-muted-foreground">
                  Archive this project (can be restored later)
                </p>
              </div>
              <div className="flex-shrink-0">
                <DeleteProjectDialog
                  projectId={projectId}
                  projectName={project.name}
                  subdomain={subdomain}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
