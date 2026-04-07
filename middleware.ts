import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabaseMiddleware";

export async function middleware(request: NextRequest) {
    // ── 301 Redirects: legacy Bestand URLs → new Manager Kader-Tab ──
    // After Wave 2 migration, /market?tab=portfolio (and the bestand sub-tab)
    // moved to /manager?tab=kader. Permanent redirect preserves bookmarks +
    // shared links + crawler indexing.
    const { pathname, searchParams } = request.nextUrl;
    if (pathname === '/market') {
        const tab = searchParams.get('tab');
        const sub = searchParams.get('sub');
        if (tab === 'portfolio' || sub === 'bestand') {
            const target = new URL('/manager?tab=kader', request.url);
            return NextResponse.redirect(target, { status: 301 });
        }
    }

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
