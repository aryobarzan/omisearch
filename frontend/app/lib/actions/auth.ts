"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { environment } from "../config";

const LoginResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
  }),
});
type LoginResponse = z.infer<typeof LoginResponseSchema>;
type User = LoginResponse["user"];

type AuthResult = { ok: true; user: User } | { ok: false; error: string };

const CredentialsSchema = z.object({
  username: z
    .string()
    .min(4)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(64),
});

export async function register(
  prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = CredentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return "Invalid username or password format.";
  const result = await loginRegister(
    parsed.data.username,
    parsed.data.password,
    true,
  );
  if (!result.ok) return result.error;
  redirect("/");
}

export async function login(
  prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = CredentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return "Invalid username or password format.";
  const result = await loginRegister(
    parsed.data.username,
    parsed.data.password,
    false,
  );
  if (!result.ok) return result.error;
  redirect("/");
}

async function loginRegister(
  username: string,
  password: string,
  isRegistering: boolean,
): Promise<AuthResult> {
  let body: FormData | string;
  const headers: Record<string, string> = {};
  if (isRegistering) {
    body = JSON.stringify({ username, password });
    headers["Content-Type"] = "application/json";
  } else {
    body = new FormData();
    body.append("username", username);
    body.append("password", password);
  }

  const fallbackError = isRegistering
    ? "Registration failed."
    : "Login failed.";

  let response: Response;
  try {
    response = await fetch(
      `${environment.apiUrl}/auth/${isRegistering ? "register" : "login"}`,
      {
        method: "POST",
        headers,
        body,
      },
    );
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }

  if (response.ok) {
    const data = await response.json();
    const parsedData = LoginResponseSchema.safeParse(data);
    if (!parsedData.success) {
      return { ok: false, error: fallbackError };
    }
    (await cookies()).set("token", parsedData.data.access_token, {
      httpOnly: true,
      secure: environment.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return { ok: true, user: parsedData.data.user };
  }

  try {
    const errData = (await response.json()) as { detail?: unknown };
    if (typeof errData.detail === "string" && errData.detail.trim()) {
      return { ok: false, error: errData.detail };
    }
  } catch {
    // non-JSON error response
  }

  return { ok: false, error: fallbackError };
}

export async function logout(): Promise<void> {
  (await cookies()).delete("token");
  redirect("/login");
}
