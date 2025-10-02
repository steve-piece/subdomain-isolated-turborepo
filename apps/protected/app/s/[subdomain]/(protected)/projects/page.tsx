// apps/protected/app/s/[subdomain]/(protected)/projects/page.tsx
/**
 * ✅ PHASE 2: Refactored projects page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Data fetching moved to wrapper component
 * - Caching enabled (revalidate = 30)
 */
import { ProjectsWrapper } from "@/components/projects/projects-wrapper";

// ✅ Projects are dynamic - cache for 30 seconds
export const revalidate = 30;

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return <ProjectsWrapper subdomain={subdomain} />;
}
