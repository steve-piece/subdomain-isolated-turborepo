export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
export const marketingDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
export const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';


