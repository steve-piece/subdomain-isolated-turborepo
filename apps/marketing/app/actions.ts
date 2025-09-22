'use server'

import { createClient } from '@/lib/supabase/server'

export interface TenantSearchResult {
  subdomain: string
  name: string
}

export interface SearchTenantsResponse {
  tenants: TenantSearchResult[]
  error?: string
}

export interface VerifyTenantResponse {
  exists: boolean
  tenant: TenantSearchResult | null
  error?: string
}

/**
 * Search for tenants by name or subdomain
 */
export async function searchTenants(query: string): Promise<SearchTenantsResponse> {
  if (!query || query.length < 2) {
    return { tenants: [] }
  }

  try {
    // Debug environment variables
    console.log('Search Debug:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY?.substring(0, 20) + '...',
      query: query
    })

    const supabase = await createClient()
    
    console.log('About to query tenants_public with query:', query)
    
    // Use the secure public view that excludes org_id and other sensitive data
    const { data: tenants, error } = await supabase
      .from('tenants_public')
      .select('subdomain, name')
      .or(`subdomain.ilike.%${query}%,name.ilike.%${query}%`)
      .order('name')
      .limit(5)
      
    console.log('Query result:', { data: tenants, error, queryUsed: `subdomain.ilike.%${query}%,name.ilike.%${query}%` })

    if (error) {
      console.error('Supabase error:', error)
      return {
        tenants: [],
        error: 'Failed to search tenants'
      }
    }

    return { 
      tenants: tenants || [] 
    }
  } catch (error) {
    console.error('Search tenants error:', error)
    return {
      tenants: [],
      error: 'Internal server error'
    }
  }
}

/**
 * Verify if a tenant exists by exact subdomain match
 */
export async function verifyTenant(subdomain: string): Promise<VerifyTenantResponse> {
  if (!subdomain || typeof subdomain !== 'string') {
    return {
      exists: false,
      tenant: null,
      error: 'Subdomain is required'
    }
  }

  try {
    const supabase = await createClient()
    
    // Check if tenant exists with exact subdomain match using secure view
    const { data: tenant, error } = await supabase
      .from('tenants_public')
      .select('subdomain, name')
      .eq('subdomain', subdomain.toLowerCase().trim())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - tenant doesn't exist
        return {
          exists: false,
          tenant: null
        }
      }
      
      console.error('Supabase error:', error)
      return {
        exists: false,
        tenant: null,
        error: 'Failed to verify tenant'
      }
    }

    return {
      exists: true,
      tenant: {
        subdomain: tenant.subdomain,
        name: tenant.name
      }
    }
  } catch (error) {
    console.error('Verify tenant error:', error)
    return {
      exists: false,
      tenant: null,
      error: 'Internal server error'
    }
  }
}
