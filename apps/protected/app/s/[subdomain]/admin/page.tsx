import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/s/${subdomain}/login`)
  }

  // TODO: Add role-based authorization check here
  // Check if user has admin/owner role for this organization

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">{subdomain} administration</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Organization Management</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Users</h3>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Manage team members</p>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Settings</h3>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Organization settings</p>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Billing</h3>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Subscription & billing</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
