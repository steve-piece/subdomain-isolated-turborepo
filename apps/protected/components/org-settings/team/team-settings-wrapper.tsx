"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { UserPlus, Users } from "lucide-react";
import { InviteUserDialog } from "@/components/shared/invite-user-dialog";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  role: string;
  email?: string;
}

interface TeamSettingsWrapperProps {
  subdomain: string;
}

export function TeamSettingsWrapper({ subdomain }: TeamSettingsWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const supabase = createClient();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=unauthorized");
    }
  }, [claims.user_role, router]);

  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("org_id", claims.org_id);

        setTeamMembers(data || []);
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, [claims.org_id, supabase]);

  // Show loading or access denied
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading) {
    return <div className="p-6">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </div>
          <InviteUserDialog
            subdomain={subdomain}
            trigger={
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members yet. Invite your first team member!
              </p>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {member.full_name || "No name"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
