import { redirect } from 'next/navigation'

export default function ProtectedHomePage() {
  // Redirect users to the marketing app's login page for subdomain lookup
  const isDevelopment = process.env.NODE_ENV === 'development'
  const marketingUrl = isDevelopment 
    ? 'http://localhost:3000/auth/login'
    : `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}/auth/login`
    
  redirect(marketingUrl)
}
