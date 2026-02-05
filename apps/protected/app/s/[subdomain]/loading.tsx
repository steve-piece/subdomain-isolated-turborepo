// apps/protected/app/s/[subdomain]/loading.tsx
// Loading UI shown while subdomain routes stream dynamic content
export default function SubdomainLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
