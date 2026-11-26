import { redirect } from "next/navigation";
import { environment } from "./config";
import { getSession } from "./session";

// Helper function for performing authenticated requests to the backend API,
// with the `Authorization` header being automatically set using the user's JWT.
// If the token is missing, i.e., they are not logged in, they are automatically
// redirected to the login page.
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getSession();
  if (!token) {
    return redirect("/login");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${environment.apiUrl}${normalizedPath}`, {
    ...init,
    headers,
  });
  // Backend itself says the token is invalid.
  if (res.status === 401) redirect("/login");
  return res;
}
