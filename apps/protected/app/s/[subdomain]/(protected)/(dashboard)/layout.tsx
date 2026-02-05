// apps/protected/app/s/[subdomain]/(dashboard)/layout.tsx
/**
 * Layout for main dashboard routes
 */
import { ScrollToTop } from "@/components/shared/scroll-to-top";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="dashboard-layout pb-10">
      {/* Scroll to top on route change */}
      <ScrollToTop />
      
      {/* Add shared dashboard UI components here */}
      <main>{children}</main>
    </div>
  );
}
