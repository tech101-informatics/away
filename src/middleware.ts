import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — no auth required
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/slack/interactions")
  ) {
    if (pathname.startsWith("/login")) {
      const token = await getToken({ req, secret });
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });

  // Redirect unauthenticated users to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string | undefined;

  // Role-based route protection — admin and manager share the same access
  if (pathname.startsWith("/admin") && role !== "admin" && role !== "manager") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/manager") && role !== "manager" && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
