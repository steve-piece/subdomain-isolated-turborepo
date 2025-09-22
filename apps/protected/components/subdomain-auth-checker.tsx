'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrganizationDashboard } from '../components/organization-dashboard'

interface SubdomainAuthCheckerProps {
  subdomain: string
}

export function SubdomainAuthChecker({ subdomain }: SubdomainAuthCheckerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        // Check if user has valid session
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          // No valid session - redirect to login
          router.replace(`/s/${subdomain}/login`)
          return
        }

        // TODO: Add organization membership verification here
        // Check if user belongs to this specific subdomain/organization
        // const { data: membership } = await supabase
        //   .from('user_profiles')
        //   .select('role, tenant_id')
        //   .eq('user_id', user.id)
        //   .single()
        
        // For now, assume user is authorized if they have a valid session
        setIsAuthenticated(true)
        setUserEmail(user.email || null)
        setIsLoading(false)
        
      } catch (error) {
        console.error('Auth check error:', error)
        // On error, redirect to login
        router.replace(`/s/${subdomain}/login`)
      }
    }

    checkAuth()
  }, [subdomain, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Loading {subdomain}</h2>
            <p className="text-muted-foreground">Checking your access...</p>
          </div>
        </div>
      </div>
    )
  }

  // If authenticated, show the dashboard
  if (isAuthenticated && userEmail) {
    return (
      <OrganizationDashboard 
        subdomain={subdomain} 
        userEmail={userEmail}
      />
    )
  }

  // Fallback - should not reach here due to redirects above
  return null
}
