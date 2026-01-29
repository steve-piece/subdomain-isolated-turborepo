// apps/protected/lib/utils/get-redirect-url.ts
export function getRedirectUrl(path: string, subdomain?: string): string {
  if (process.env.NODE_ENV === "development") {
    const subdomainPart = subdomain ? `${subdomain}.` : "";
    return `http://${subdomainPart}localhost:3003${path.startsWith("/") ? path : `/${path}`}`;
  }

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (!domain) {
    throw new Error("NEXT_PUBLIC_APP_DOMAIN not set");
  }

  const subdomainPart = subdomain ? `${subdomain}.` : "";
  return `https://${subdomainPart}${domain}${path.startsWith("/") ? path : `/${path}`}`;
}
