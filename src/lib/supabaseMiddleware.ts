import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { countryToTier, GEOFENCING_ENABLED } from "@/lib/geofencing";

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // ── Geofencing: detect tier + block TIER_BLOCKED countries ──
    const country = request.headers.get("x-vercel-ip-country");
    const geoTier = GEOFENCING_ENABLED ? countryToTier(country) : null;

    if (GEOFENCING_ENABLED && geoTier === "blocked" && pathname !== "/blocked") {
        const url = request.nextUrl.clone();
        url.pathname = "/blocked";
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    // Set geo tier cookie for client-side feature gates
    if (geoTier) {
        supabaseResponse.cookies.set("bescout-geo-tier", geoTier, {
            path: "/",
            httpOnly: false,
            sameSite: "lax",
            maxAge: 60 * 60, // 1 hour
        });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (err) {
        // Supabase down or network error — treat as logged out
        console.error('[Middleware] Session refresh failed:', err);
    }

    // Define public routes (login, auth callback, onboarding, blocked)
    const publicRoutes = ["/login", "/auth/callback", "/onboarding", "/welcome", "/club", "/pitch", "/blocked"];
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    // If no user and trying to access a protected route, redirect to login
    if (!user && !isPublicRoute && !pathname.startsWith("/_next") && !pathname.startsWith("/api") && !pathname.startsWith("/static")) {
        const url = request.nextUrl.clone();
        url.pathname = "/welcome";
        return NextResponse.redirect(url);
    }

    // Admin route protection — server-side guard
    if (user) {
        // /bescout-admin* → must be platform_admin
        if (pathname.startsWith("/bescout-admin")) {
            const { data: adminRow } = await supabase
                .from("platform_admins")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();
            if (!adminRow) {
                const url = request.nextUrl.clone();
                url.pathname = "/";
                return NextResponse.redirect(url);
            }
        }

        // /club/[slug]/admin* → must be club_admin for that club
        const clubAdminMatch = pathname.match(/^\/club\/([^/]+)\/admin/);
        if (clubAdminMatch) {
            const slug = clubAdminMatch[1];
            const { data: clubRow } = await supabase
                .from("clubs")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();
            if (clubRow) {
                // Platform admins can access any club's admin panel
                const { data: platformRow } = await supabase
                    .from("platform_admins")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();
                if (!platformRow) {
                    // Not a platform admin — check club_admins
                    const { data: caRow } = await supabase
                        .from("club_admins")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("club_id", clubRow.id)
                        .maybeSingle();
                    if (!caRow) {
                        const url = request.nextUrl.clone();
                        url.pathname = `/club/${slug}`;
                        return NextResponse.redirect(url);
                    }
                }
            } else {
                // Club doesn't exist → redirect to /club
                const url = request.nextUrl.clone();
                url.pathname = "/club";
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}
