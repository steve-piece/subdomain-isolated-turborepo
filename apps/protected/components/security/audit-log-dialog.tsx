"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getAuditLogs } from "@/app/actions/security/audit-log";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  event_type: string;
  event_action: string;
  event_metadata: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  location_data: Record<string, unknown> | null;
  severity: "info" | "warning" | "critical";
  created_at: string;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
};

type AuditLogsResponse = {
  success: boolean;
  data?: AuditLog[];
  message?: string;
  pagination?: PaginationInfo;
};

export function AuditLogDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const pageSize = 20;

  const fetchLogs = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuditLogs(pageSize, page) as AuditLogsResponse;
      if (result.success && result.data) {
        setLogs(result.data);
        setPagination(result.pagination || null);
        setCurrentPage(page);
      } else {
        setError(result.message || "Failed to fetch logs");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs(1);
    } else {
      // Reset state when dialog closes
      setCurrentPage(1);
      setPagination(null);
      setLogs([]);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          View Full Audit Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col px-8">
        <DialogHeader>
          <DialogTitle>Audit Log</DialogTitle>
          <DialogDescription>
            View your account security events and login history
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-destructive gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No audit logs found.
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                  >
                    {/* Severity indicator */}
                    <div className="shrink-0">
                      {log.severity === "critical" ? (
                        <div className="w-2 h-2 rounded-full bg-destructive"></div>
                      ) : log.severity === "warning" ? (
                        <div className="w-2 h-2 rounded-full bg-warning-muted0"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                      )}
                    </div>

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.event_action}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {log.event_type}
                        </span>
                        {log.severity !== "info" && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            log.severity === "critical"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning-muted0/10 text-warning"
                          }`}>
                            {log.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Pagination Controls */}
            {pagination && pagination.total > pageSize && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {Math.ceil(pagination.total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(currentPage + 1)}
                    disabled={currentPage === Math.ceil(pagination.total / pageSize) || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
