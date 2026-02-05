// apps/protected/app/s/[subdomain]/(protected)/projects/[id]/page.tsx
/**
 * ✅ PHASE 2: Refactored project detail page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Data fetching moved to wrapper component
 * - MIGRATED from: export const revalidate = 60
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife('minutes') if caching needed
 */
import type { ReactElement } from "react";
import { ProjectDetailWrapper } from "@/components/projects/project-detail-wrapper";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}): Promise<ReactElement> {
  const { subdomain, id: projectId } = await params;

  // ✅ No auth calls - layout provides via context
  return <ProjectDetailWrapper subdomain={subdomain} projectId={projectId} />;
}
