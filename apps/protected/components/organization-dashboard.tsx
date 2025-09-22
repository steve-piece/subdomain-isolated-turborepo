'use client'

import { LogoutButton } from '@/components/logout-button'

interface OrganizationDashboardProps {
  subdomain: string
  userEmail: string
}

export function OrganizationDashboard({ subdomain, userEmail }: OrganizationDashboardProps) {
  return (
    <div className="flex h-screen w-full flex-col">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{subdomain}</h1>
            <p className="text-muted-foreground">Welcome back, {userEmail}</p>
          </div>
          <LogoutButton subdomain={subdomain} />
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
            <p className="text-muted-foreground mb-6">
              This is your organization dashboard for {subdomain}.
            </p>
            
            {/* Dashboard Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Users</h3>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Team members</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Projects</h3>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Active projects</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Settings</h3>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Organization settings</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  Invite Users
                </button>
                <button className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
                  Settings
                </button>
                <button className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
                  Admin Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
