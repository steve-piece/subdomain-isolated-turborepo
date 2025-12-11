// apps/marketing/middleware.ts
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function proxy(request: NextRequest) {
  Sentry.logger.debug("marketing_middleware_request", {
    url: request.url,
  });
  const response = await updateSession(request);
  Sentry.logger.debug("marketing_middleware_response", {
    redirected: response.headers.get("location") !== null,
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
