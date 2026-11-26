import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { environment } from "@/app/lib/config";

// authentication not needed for these routes
const PUBLIC_PATHS = ["/login", "/register"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${environment.apiUrl}/.well-known/jwks.json`),
    );
  }
  return jwks;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = request.cookies.get("token")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, getJWKS(), { algorithms: ["RS256"] });
      valid = true;
    } catch {
      // bad signature, expired, or backend unreachable (in case getJWKS fails)
    }
  }

  if (!valid && !isPublic) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("token");
    return res;
  }
  if (valid && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
