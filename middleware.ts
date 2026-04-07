import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabaseMiddleware";

// Note: Wave 2 legacy redirects (/market?tab=portfolio → /manager?tab=kader)
// are configured in next.config.mjs `redirects()` rather than here. The
// middleware approach didn't fire reliably on Vercel; native config redirects
// run at the edge layer above middleware and work consistently.

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - sw.js (service worker)
         * - manifest.webmanifest (PWA manifest)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
