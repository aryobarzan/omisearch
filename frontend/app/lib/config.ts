const rawApiUrl = process.env.API_URL ?? "http://localhost:8000";

export const environment = {
  production: process.env.NODE_ENV === "production",
  // remove trailing slashes:
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
};
