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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Folder, Users, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

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
    <>
      <PageHeader title="Projects" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Action Bar */}
        {canCreateProjects && (
          <div className="flex justify-end">
            <CreateProjectDialog
              subdomain={subdomain}
              trigger={
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              }
            />
          </div>
        )}
        {/* Projects Grid / Empty State */}
        <div className="flex-1 min-h-0">
          {projects.length === 0 ? (
            <Empty className="border h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Folder />
                </EmptyMedia>
                <EmptyTitle>No Projects Yet</EmptyTitle>
                <EmptyDescription>
                  You haven&apos;t created any projects yet. Get started by
                  creating your first project to organize your team&apos;s work.
                </EmptyDescription>
              </EmptyHeader>
              {canCreateProjects && (
                <EmptyContent>
                  <CreateProjectDialog
                    subdomain={subdomain}
                    trigger={
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    }
                  />
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer flex flex-col">
                    <CardHeader className="flex-1">
                      <CardTitle className="flex items-start gap-2 group-hover:text-primary transition-colors">
                        <Folder className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 break-words">
                          {project.name}
                        </span>
                      </CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                        {project.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground border-t pt-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {project.member_count}{" "}
                            {project.member_count === 1 ? "member" : "members"}
                          </span>
                        </div>
                        <div className="flex items-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>View →</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
