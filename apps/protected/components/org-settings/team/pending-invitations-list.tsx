"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Clock, Check, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  getPendingInvitations,
  approveInvitation,
  rejectInvitation,
  type PendingInvitation,
} from "@/app/actions/invitations/pending";
import { formatDistanceToNow } from "date-fns";

interface PendingInvitationsListProps {
  orgId: string;
  subdomain: string;
}

export function PendingInvitationsList({
  orgId,
  subdomain,
}: PendingInvitationsListProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending invitations
  useEffect(() => {
    async function fetchInvitations() {
      setIsLoading(true);
      setError(null);

      const response = await getPendingInvitations(orgId);

      if (response.success && response.invitations) {
        setInvitations(response.invitations);
      } else {
        setError(response.message || "Failed to load pending invitations");
      }

      setIsLoading(false);
    }

    fetchInvitations();
  }, [orgId]);

  const handleApprove = async (invitationId: string) => {
    setProcessingId(invitationId);
    setError(null);

    const response = await approveInvitation(invitationId, subdomain);

    if (response.success) {
      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } else {
      setError(response.message);
    }

    setProcessingId(null);
  };

  const handleReject = async (invitationId: string) => {
    setProcessingId(invitationId);
    setError(null);

    const response = await rejectInvitation(invitationId);

    if (response.success) {
      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } else {
      setError(response.message);
    }

    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-pulse text-primary" />
            <span className="ml-2">Loading pending invitations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show card if no pending invitations
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Invitations
          <Badge variant="secondary">{invitations.length}</Badge>
        </CardTitle>
        <CardDescription>
          Review and approve member invitations awaiting your approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invitations.map((invitation) => {
          const isExpired = new Date(invitation.expires_at) < new Date();
          const isProcessing = processingId === invitation.id;

          return (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{invitation.email}</p>
                  <Badge variant="outline" className="capitalize">
                    {invitation.proposed_role}
                  </Badge>
                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Invited by {invitation.inviter_name} •{" "}
                  {formatDistanceToNow(new Date(invitation.created_at), {
                    addSuffix: true,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expires{" "}
                  {formatDistanceToNow(new Date(invitation.expires_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(invitation.id)}
                  disabled={isProcessing || isExpired}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(invitation.id)}
                  disabled={isProcessing || isExpired}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {isProcessing ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
