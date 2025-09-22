import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to {subdomain}</p>
        </div>
        <LoginForm subdomain={subdomain} />
      </div>
    </div>
  )
}
