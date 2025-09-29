export function getRedirectUrl(path: string, subdomain?: string): string {
  console.log("🔍 getRedirectUrl - Called with:", {
    path,
    subdomain,
    nodeEnv: process.env.NODE_ENV,
  });

  if (process.env.NODE_ENV === "development") {
    const url = `http://localhost:3003${path.startsWith("/") ? path : `/${path}`}`;
    console.log("🔄 getRedirectUrl - Development URL:", url);
    return url;
  }

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (!domain) {
    throw new Error("NEXT_PUBLIC_APP_DOMAIN not set");
  }

  const subdomainPart = subdomain ? `${subdomain}.` : "";
  const url = `https://${subdomainPart}${domain}${path.startsWith("/") ? path : `/${path}`}`;
  console.log("🔄 getRedirectUrl - Production URL:", url);
  return url;
}
