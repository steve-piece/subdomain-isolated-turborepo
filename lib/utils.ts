import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const protocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';

// Marketing domain (public website)
export const marketingDomain =
  process.env.NEXT_PUBLIC_MARKETING_DOMAIN ||
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
  'localhost:3000';

// App domain (protected routes and tenant subdomains)
export const appDomain =
  process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Back-compat: some places may still import rootDomain; treat as marketing domain
export const rootDomain = marketingDomain;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
