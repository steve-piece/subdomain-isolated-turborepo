import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { extractSubdomainFromHostname } from '@workspace/ui/lib/subdomains'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host')
  
  // Extract subdomain from hostname using utility function
  const subdomain = extractSubdomainFromHostname(hostname || '')
  
  // If accessing via subdomain, rewrite to subdomain route
  if (subdomain) {
    // Rewrite to /s/[subdomain] route if not already
    if (!url.pathname.startsWith('/s/')) {
      url.pathname = `/s/${subdomain}${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }
  
  // Handle auth session updates 
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
