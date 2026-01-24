// apps/protected/app/s/[subdomain]/(dashboard)/layout.tsx
/**
 * Layout for main dashboard routes
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="dashboard-layout pb-10">
      {/* Add shared dashboard UI components here */}
      <main>{children}</main>
    </div>
  );
}
