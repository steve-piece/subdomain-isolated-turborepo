'use client'

import { cn } from '@workspace/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { generateSubdomainSuggestion, isValidSubdomain } from '@workspace/ui/lib/subdomains'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OrganizationSignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [organizationName, setOrganizationName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Auto-generate subdomain from organization name
  const handleOrganizationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setOrganizationName(name)
    
    // Generate subdomain suggestion using utility function
    const suggestion = generateSubdomainSuggestion(name)
    
    setSubdomain(suggestion)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!isValidSubdomain(subdomain)) {
      setError('Subdomain must be 3-63 characters and contain only letters, numbers, and hyphens')
      setIsLoading(false)
      return
    }

    try {
      // First, check if subdomain is available
      // TODO: Add subdomain availability check API call here
      
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            organization_name: organizationName,
            subdomain: subdomain,
            role: 'owner'
          }
        },
      })

      if (authError) throw authError

      // TODO: Create organization record in database here
      // This would typically involve calling an API endpoint to:
      // 1. Create organization record
      // 2. Set up subdomain mapping
      // 3. Assign user as owner

      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription>Set up your account and organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="organization-name">Organization Name</Label>
                <Input
                  id="organization-name"
                  type="text"
                  placeholder="Acme Inc"
                  required
                  value={organizationName}
                  onChange={handleOrganizationNameChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    type="text"
                    placeholder="acme"
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className="rounded-r-none"
                  />
                  <span className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-muted-foreground">
                    .yourapp.com
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your team will access the app at {subdomain || 'subdomain'}.yourapp.com
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@acme.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Confirm Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating organization...' : 'Create organization'}
              </Button>
            </div>
            
            <div className="mt-4 text-center text-sm">
              Already have an organization?{' '}
              <Link href="/signin" className="underline underline-offset-4">
                Find your team
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
