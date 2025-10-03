// apps/protected/app/s/[subdomain]/(protected)/projects/page.tsx
/**
 * ✅ Server-side data fetching with centralized auth
 * - Auth handled by layout
 * - Data fetched on server for performance
 * - Caching enabled (revalidate = 30)
 */
import { createClient } from "@/lib/supabase/server";
import { ProjectsWrapper } from "@/components/projects/projects-wrapper";
import { redirect } from "next/navigation";

export const revalidate = 30;

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Get claims from layout context
  const { data: claims } = await supabase.auth.getClaims();
  const orgId = claims?.claims.org_id;
  const capabilities = claims?.claims.capabilities || [];

  if (!orgId) redirect("/auth/login");

  // ✅ Fetch projects on server
  const { data: projects } = await supabase
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
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const projectsWithCount =
    projects?.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: project.created_at,
      member_count: project.project_permissions?.length || 0,
    })) || [];

  const canCreateProjects = capabilities.includes("projects.create");

  return (
    <ProjectsWrapper
      projects={projectsWithCount}
      subdomain={subdomain}
      canCreateProjects={canCreateProjects}
    />
  );
}
