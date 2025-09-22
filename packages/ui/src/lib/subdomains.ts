/**
 * Validates a subdomain string
 */
export function isValidSubdomain(subdomain: string): boolean {
  if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
    return false
  }
  
  // Check for valid characters (alphanumeric and hyphens, but not starting/ending with hyphen)
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
  return validPattern.test(subdomain.toLowerCase())
}

/**
 * Generates a subdomain suggestion from an organization name
 */
export function generateSubdomainSuggestion(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

/**
 * Extracts subdomain from hostname
 */
export function extractSubdomainFromHostname(hostname: string): string | null {
  if (!hostname) return null
  
  const parts = hostname.split('.')
  
  // For localhost development (e.g., subdomain.localhost:3001)
  if (hostname.includes('localhost')) {
    const subdomain = parts[0]
    return subdomain && subdomain !== 'localhost' ? subdomain : null
  }
  
  // For production (e.g., subdomain.yourapp.com)
  if (parts.length >= 3) {
    const subdomain = parts[0]
    return subdomain && subdomain !== 'www' ? subdomain : null
  }
  
  return null
}

/**
 * Builds the full URL for a subdomain
 */
export function buildSubdomainUrl(subdomain: string, path = '/', isDevelopment = false, appDomain?: string): string {
  if (isDevelopment) {
    return `http://${subdomain}.localhost:3001${path}`
  }
  
  const domain = appDomain || process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourapp.com'
  return `https://${subdomain}.${domain}${path}`
}
