// apps/protected/app/s/[subdomain]/(protected)/projects/[id]/page.tsx
/**
 * ✅ PHASE 2: Refactored project detail page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Data fetching moved to wrapper component
 * - Caching enabled (revalidate = 60)
 */
import type { ReactElement } from "react";
import { ProjectDetailWrapper } from "@/components/projects/project-detail-wrapper";

// ✅ Project details can be cached for 60 seconds
export const revalidate = 60;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}): Promise<ReactElement> {
  const { subdomain, id: projectId } = await params;

  // ✅ No auth calls - layout provides via context
  return <ProjectDetailWrapper subdomain={subdomain} projectId={projectId} />;
}
