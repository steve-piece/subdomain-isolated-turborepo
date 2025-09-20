(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root-of-the-server]__d2265481._.js", {

"[externals]/node:buffer [external] (node:buffer, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[project]/lib/utils.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "appDomain": (()=>appDomain),
    "cn": (()=>cn),
    "marketingDomain": (()=>marketingDomain),
    "protocol": (()=>protocol),
    "rootDomain": (()=>rootDomain)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [middleware-edge] (ecmascript)");
;
;
const protocol = ("TURBOPACK compile-time falsy", 0) ? ("TURBOPACK unreachable", undefined) : 'http';
const marketingDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const rootDomain = marketingDomain;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}}),
"[project]/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "config": (()=>config),
    "middleware": (()=>middleware)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [middleware-edge] (ecmascript)");
;
;
function extractSubdomain(request) {
    const url = request.url;
    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0];
    // Local development environment
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
        // Try to extract subdomain from the full URL
        const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
        if (fullUrlMatch && fullUrlMatch[1]) {
            return fullUrlMatch[1];
        }
        // Fallback to host header approach
        if (hostname.includes('.localhost')) {
            return hostname.split('.')[0];
        }
        return null;
    }
    // Production environment
    const appRoot = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["appDomain"].split(':')[0];
    const marketingRoot = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["marketingDomain"].split(':')[0];
    // Handle preview deployment URLs (tenant---branch-name.vercel.app)
    if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
        const parts = hostname.split('---');
        return parts.length > 0 ? parts[0] : null;
    }
    // Regular subdomain detection — only treat subdomains under app domain as tenants
    const isSubdomain = hostname !== appRoot && hostname !== `www.${appRoot}` && hostname.endsWith(`.${appRoot}`);
    // Do not consider subdomains under marketing domain as tenants
    if (hostname !== marketingRoot && hostname !== `www.${marketingRoot}` && hostname.endsWith(`.${marketingRoot}`)) {
        return null;
    }
    return isSubdomain ? hostname.replace(`.${appRoot}`, '') : null;
}
async function middleware(request) {
    const { pathname } = request.nextUrl;
    const subdomain = extractSubdomain(request);
    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0];
    const appRoot = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["appDomain"].split(':')[0];
    const marketingRoot = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["marketingDomain"].split(':')[0];
    // If request is for the marketing domain, ensure admin is accessible and no tenant rewrite
    if (hostname === marketingRoot || hostname === `www.${marketingRoot}`) {
        // Marketing domain: never rewrite to tenant pages
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    if (subdomain) {
        // Block access to admin page from subdomains
        if (pathname.startsWith('/admin')) {
            // Send them to marketing admin
            const protocol = request.nextUrl.protocol; // includes ':'
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/admin', `${protocol}//${marketingRoot}`));
        }
        // Rewrite all tenant subdomain paths to /s/[subdomain]/...
        const targetPath = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(new URL(targetPath, request.url));
    }
    // On the app root or anywhere else, allow normal access
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */ '/((?!api|_next|[\\w-]+\\.\\w+).*)'
    ]
};
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__d2265481._.js.map