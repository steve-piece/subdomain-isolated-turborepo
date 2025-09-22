import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 text-4xl">🏢</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center justify-center">
            <span className="mr-2">🔐</span>
            Sign in to <span className="font-medium ml-1">{subdomain}</span>
          </p>
        </div>
        <div className="shadow-xl">
          <LoginForm subdomain={subdomain} />
        </div>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Secure access to your organization workspace</p>
        </div>
      </div>
    </div>
  )
}
