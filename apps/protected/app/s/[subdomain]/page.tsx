// apps/protected/app/s/[subdomain]/page.tsx
import { SubdomainAuthChecker } from "@/components/shared/subdomain-auth-checker";

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  return <SubdomainAuthChecker subdomain={subdomain} />;
}
