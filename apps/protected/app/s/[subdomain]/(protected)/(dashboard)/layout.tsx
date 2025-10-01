// apps/protected/app/s/[subdomain]/(dashboard)/layout.tsx
/**
 * Layout for main dashboard routes
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      {/* Add shared dashboard UI components here */}
      <main>{children}</main>
    </div>
  );
}
