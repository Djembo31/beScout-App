import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

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
    } catch {
        // Supabase down or network error — treat as logged out
    }

    // Define public routes (login, auth callback, onboarding)
    const publicRoutes = ["/login", "/auth/callback", "/supabase-test", "/onboarding", "/welcome"];
    const pathname = request.nextUrl.pathname;
    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    // If no user and trying to access a protected route, redirect to login
    if (!user && !isPublicRoute && !pathname.startsWith("/_next") && !pathname.startsWith("/api") && !pathname.startsWith("/static")) {
        const url = request.nextUrl.clone();
        url.pathname = "/welcome";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
