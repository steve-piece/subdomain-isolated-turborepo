import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";

export default async function SecurityAuditLogPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch security audit logs for the user
  const { data: auditLogs } = await supabase
    .from("security_audit_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Security Audit Log
        </h2>
        <p className="text-muted-foreground">
          Complete history of security events on your account
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6">
          {auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          log.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : log.severity === "warning"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.severity}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          log.event_action === "success"
                            ? "bg-green-100 text-green-800"
                            : log.event_action === "failure"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {log.event_action}
                      </span>
                      <span className="text-sm font-medium">
                        {log.event_type}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {log.ip_address && (
                        <span className="mr-4">IP: {log.ip_address}</span>
                      )}
                      {log.user_agent && (
                        <span className="block truncate text-xs">
                          {log.user_agent}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium">No audit logs yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Security events will appear here as you use your account
              </p>
            </div>
          )}
        </div>
      </div>

      {auditLogs && auditLogs.length >= 50 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing last 50 events. Older events are archived.
        </div>
      )}
    </div>
  );
}
