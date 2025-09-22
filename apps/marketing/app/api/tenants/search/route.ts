import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ tenants: [] })
  }

  try {
    const supabase = await createClient()
    
    // Use the secure public view that excludes org_id and other sensitive data
    const { data: tenants, error } = await supabase
      .from('tenants_public')
      .select('subdomain, name')
      .or(`subdomain.ilike.%${query}%,name.ilike.%${query}%`)
      .order('name')
      .limit(5)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to search tenants' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tenants: tenants || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
