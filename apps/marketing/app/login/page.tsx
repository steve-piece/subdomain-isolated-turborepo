import { marketingDomain, appDomain, protocol } from '@voldegard/shared';

export default function LoginPage() {
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  const marketingRoot = marketingDomain.split(':')[0];
  const appRoot = appDomain.split(':')[0];
  const isMarketing = hostname ? (hostname === marketingRoot || hostname === `www.${marketingRoot}`) : true;
  const isAppRoot = hostname ? hostname === appRoot : false;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {isMarketing || isAppRoot ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Sign in to your account</h1>
            <form action={`${protocol}://${marketingRoot}/login/redirect`} method="GET" className="space-y-3">
              <div className="flex">
                <input
                  className="flex-1 border border-input rounded-l-md px-3 py-2"
                  name="account"
                  placeholder="your-account"
                  required
                />
                <span className="bg-gray-100 px-3 border border-l-0 border-input rounded-r-md text-gray-500 min-h-[36px] flex items-center">
                  .{appRoot}
                </span>
              </div>
              <button type="submit" className="w-full border rounded-md py-2 bg-black text-white">
                Continue
              </button>
            </form>
            <p className="text-sm text-gray-500">You will be redirected to your account’s login page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Continue to your account</h1>
            <a href={`${protocol}://${marketingRoot}/login`} className="text-blue-600 underline">
              Use account picker on {marketingRoot}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


