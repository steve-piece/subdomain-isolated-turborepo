// components/projects/projects-wrapper.tsx
"use client";

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
  projects: Project[];
  subdomain: string;
  canCreateProjects: boolean;
}

export function ProjectsWrapper({
  projects,
  subdomain,
  canCreateProjects,
}: ProjectsWrapperProps) {
  // ✅ Pure UI component - no data fetching

  return (
    <div className="container py-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s projects
          </p>
        </div>
        {canCreateProjects && (
          <CreateProjectDialog
            subdomain={subdomain}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            }
          />
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
              <CreateProjectDialog
                subdomain={subdomain}
                trigger={
                  <Button className="mr-4">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                }
              />
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
