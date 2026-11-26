import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { importSPKI, jwtVerify } from "jose";

// authentication not needed for these routes
const PUBLIC_PATHS = ["/login", "/register"];

let publicKeyPromise: ReturnType<typeof importSPKI> | null = null;

function getPublicKey() {
  const pem = process.env.JWT_PUBLIC_KEY;
  if (!pem) return null;
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(pem, "RS256");
  }
  return publicKeyPromise;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = request.cookies.get("token")?.value;
  let valid = false;
  const publicKey = getPublicKey();
  if (token && publicKey) {
    try {
      await jwtVerify(token, await publicKey, { algorithms: ["RS256"] });
      valid = true;
    } catch {
      // bad signature or expired
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
