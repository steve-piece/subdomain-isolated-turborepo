"use client";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

interface OrganizationDashboardProps {
  subdomain: string;
  userEmail: string;
}

export function OrganizationDashboard({
  subdomain,
  userEmail,
}: OrganizationDashboardProps) {
  return (
    <div className="flex h-screen w-full flex-col">
      <header className="border-b bg-gradient-to-r from-background to-muted/20 px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {subdomain}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center">
              👋 Welcome back,{" "}
              <span className="font-medium ml-1">{userEmail}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                ⚙️ Admin Panel
              </Button>
            </Link>
            <LogoutButton subdomain={subdomain} />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                🏢 {subdomain} Dashboard
              </CardTitle>
              <CardDescription className="text-base">
                Manage your organization, team, and projects all in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Dashboard Stats */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <div className="text-2xl">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No members yet</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <div className="text-2xl">📋</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Start your first project
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Storage Used
                </CardTitle>
                <div className="text-2xl">💾</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 GB</div>
                <p className="text-xs text-muted-foreground">
                  Of 10 GB available
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚡ Quick Actions
                </CardTitle>
                <CardDescription>
                  Get started with these common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" size="lg">
                  <span className="mr-2">👤</span>
                  Invite Team Members
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <span className="mr-2">📁</span>
                  Create New Project
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <span className="mr-2">⚙️</span>
                  Organization Settings
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates from your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">🔄</div>
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">
                    Activity will appear here as your team starts working
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
