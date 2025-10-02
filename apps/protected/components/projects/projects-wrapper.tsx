// components/projects/projects-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreateProjectDialog } from "./create-project-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Folder, Users, Plus } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
}

interface ProjectsWrapperProps {
  subdomain: string;
}

export function ProjectsWrapper({ subdomain }: ProjectsWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canCreateProjects = claims.capabilities.includes("projects.create");

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data } = await supabase
          .from("projects")
          .select(
            `
            id,
            name,
            description,
            created_at,
            project_permissions (
              user_id
            )
          `
          )
          .eq("org_id", claims.org_id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        // Transform data to include member count
        const projectsWithCount =
          data?.map((project: any) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            created_at: project.created_at,
            member_count: project.project_permissions?.length || 0,
          })) || [];

        setProjects(projectsWithCount);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [claims.org_id, supabase]);

  if (isLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your organization's projects
          </p>
        </div>
        {canCreateProjects && (
          <CreateProjectDialog subdomain={subdomain}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </CreateProjectDialog>
        )}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No projects yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by creating your first project
            </p>
            {canCreateProjects && (
              <CreateProjectDialog subdomain={subdomain}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CreateProjectDialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    {project.name}
                  </CardTitle>
                  <CardDescription>
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{project.member_count} members</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
