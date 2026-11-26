import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { cache } from "react";

export async function getSession(): Promise<string | undefined> {
  return (await cookies()).get("token")?.value;
}

// The signature is already verified by proxy.ts before any request reaches
// server code, so decoding is enough here for UI display.
// Note: this is simplified to a plain username string. For future extension (e.g., extra JWT claims),
// the return type should be changed to an object (example):
// export type SessionUser = {
// username: string;
// role: string;
// };
export const getUser = cache(async (): Promise<string | null> => {
  const token = await getSession();
  if (!token) return null;
  try {
    const { sub } = decodeJwt(token);
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
});
