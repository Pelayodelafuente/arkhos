import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVITY_COOKIE,
  ACTIVITY_COOKIE_MAX_AGE,
  IDLE_TIMEOUT_MS,
} from "@/lib/auth/session";

/** Marca la actividad reciente (sliding window de inactividad). */
function stampActivity(res: NextResponse, now: number) {
  res.cookies.set(ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVITY_COOKIE_MAX_AGE,
  });
}

/** Borra el marcador de actividad + todas las cookies de sesión de Supabase. */
function clearSessionCookies(request: NextRequest, res: NextResponse) {
  res.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
    }
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const now = Date.now();

  // ── Caducidad por inactividad (solo usuarios autenticados) ──────────────
  // Si pasan más de IDLE_TIMEOUT_MS sin ninguna request, se cierra la sesión.
  if (user) {
    const raw = request.cookies.get(ACTIVITY_COOKIE)?.value;
    const lastActive = raw ? Number(raw) : NaN;
    const expired =
      Number.isFinite(lastActive) && now - lastActive > IDLE_TIMEOUT_MS;

    if (expired) {
      await supabase.auth.signOut();
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json(
          { error: "session_expired" },
          { status: 401 }
        );
        clearSessionCookies(request, res);
        return res;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("expired", "1");
      const res = NextResponse.redirect(url);
      clearSessionCookies(request, res);
      return res;
    }
  }

  // Protected routes: redirect to /login if not authenticated
  if (
    !user &&
    pathname !== "/login" &&
    pathname !== "/register" &&
    pathname !== "/verify-mfa" &&
    pathname !== "/reset-password" &&
    pathname !== "/offline" &&
    !pathname.startsWith("/auth/") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users visiting auth pages → redirect to dashboard
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const res = NextResponse.redirect(url);
    stampActivity(res, now);
    return res;
  }

  // MFA check: if user has aal2 required, redirect to /verify-mfa
  // try/catch: fail-open so a Supabase Auth timeout never blocks authenticated requests with 503
  if (user && pathname !== "/verify-mfa") {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/verify-mfa";
        const res = NextResponse.redirect(url);
        stampActivity(res, now);
        return res;
      }
    } catch (err) {
      // fail-open: let the request proceed rather than returning 503.
      // Logged because a sustained Auth outage silently disables the MFA gate.
      console.error(
        "[proxy] MFA AAL check failed — letting request through:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // Renueva la marca de actividad en cada request autenticada (sliding window)
  if (user) {
    stampActivity(supabaseResponse, now);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
