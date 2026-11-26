# Omisearch

## Overview

Simple web interface for viewing tabular omics data by uploading a gene expression table and sample annotation data.

## Getting Started

This monorepo uses Docker to start up both the backend and frontend using a single command:

```bash
docker compose up --build -d
```

Afterwards, you can access the app:

- `localhost:3000`: Next.js frontend
- `localhost:8000`: FastAPI backend, e.g., `localhost:8000/docs` for the generated OpenAPI documentation.

Environment variables have sensible defaults, and the RSA keypair for JWT signing and verification is generated automatically, so no manual .env setup is required.

## Stack

- **Backend:** FastAPI, SQLite, Docker
  - **Authentication:** token-based (JWT), password hashing using Argon2
- **Frontend:** Next.js, React, Tailwind CSS

### Authentication

#### Backend

Users register with a username and password. Upon registration/login, they are issued a signed json web token (JWT), to be attached to all subsequent requests by the frontend which require authentication.

- Signing of the token is done with a keypair (RS256) - this allows the frontend (Next.js) to also perform verification using the public key.
- To keep the user flow simple for this project, refresh tokens are omitted from the authentication flow: the issued authentication token stays valid for an extended duration (24 hours), rather than a standard 15 or 10 minutes, to avoid the need for a periodic refresh of the issued token using a separate refresh token.
- Similarly, reset tokens are omitted, which are typically used to support operations such as secure password resets.
- Passwords are hashed with **Argon2** from the `pwdlib` package.
- To prevent timing-based attacks, a dummy hash check is always performed for non-existent usernames when logging in.

**Note:** given the standard approach taken for the implementation of JWT authentication, I have re-used my Python code from a past [FastAPI project](https://github.com/aryobarzan/photo_classification-fastapi) which similarly implemented username/password authentication with JWT. However, a few aspects from the original code were reworked for this project:

- User data is stored in a lighter SQLite database, rather than in a PostgreSQL database hosted as a separate Docker service.
- The `UserRole` field of the User schema was removed, as this project does not make a distinction between normal users and administrators for any kind of privileged access.
- The route prefix `/users` from the original code was renamed to `/auth`.

#### Frontend

Authentication on the Next.js side is handled server-first using Server Actions, an `httpOnly` cookie, and Next.js 16's `proxy.ts` route guard:

- The `/login` and `/register` forms use `react-hook-form` for instant client-side validation and `useActionState` to submit credentials to Next.js Server Actions (`app/lib/actions/auth.ts`), which re-validate inputs with `zod` before calling the FastAPI backend's `/auth/login` or `/auth/register` endpoints.
- On success, the returned JWT is stored in an `httpOnly` cookie (`token`, `sameSite: "lax"`, 24-hour `maxAge`) so client-side JavaScript cannot read it. Logging out deletes the cookie and redirects to `/login`.
- Route protection runs in `proxy.ts` using `jose` to verify the RS256 JWT signature before protected pages render, redirecting unauthenticated requests to `/login` (and already-authenticated users away from `/login` and `/register`).
- Authenticated server-side API calls go through an `apiFetch` helper (`app/lib/api.ts`) that reads the `token` cookie and attaches it as an `Authorization: Bearer <token>` header.

**Note:** similar to the backend, the frontend auth flow was adapted from my past [Next.js project](https://github.com/aryobarzan/photo-classification-nextjs), with several changes for this project:

- Removed role/admin logic (`role` in response schemas, `isAdmin()` in `session.ts`, and admin dashboard/profile routes), simplifying `getUser()` to return a plain username string (`string | null`).
- Updated auth calls from `/users/*` to `/auth/*` and dropped unused packages (`i18n-iso-countries`, `swr`).
- Replaced custom CSS classes and Material Symbols icons with Tailwind CSS utility classes.
- Removed top-level `process.env` throws in `app/lib/config.ts` and `proxy.ts` (falling back safely at build time) so `next build` succeeds cleanly inside Docker without requiring runtime environment variables.

### Database

A lightweight **SQLite** database is used for storage purposes (users), stored as a _.db_ file inside the backend itself. The forward-looking alternative would be a dedicated PostgreSQL database hosted as a separate Docker service, though given the scope of this project, that would be overkill. My past [FastAPI project](https://github.com/aryobarzan/photo_classification-fastapi), from which I am re-using the authentication and user schema code, relied on a PostgreSQL database.

## Miscellaneous

### Backend (FastAPI)

FastAPI backend project was set up under `/backend` with a `requirements.txt`.

### Frontend (Next.js)

Next.js project was created under `/frontend` using the official project scaffolder, specifically:

```bash
pnpm create next-app@16 frontend --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --yes
```

- `--app`: use the modern app router approach
- `--use-pnpm`: use pnpm as the package manager

A few packages were then manually updated from the default ones, specifically:

- `typescript`: ^5 -> ^6
- `@types/node`: ^20 -> ^24
- `eslint`: 9.39.5 -> ^10

### Other

- `.gitignore` was created via [https://www.toptal.com/developers/gitignore](https://www.toptal.com/developers/gitignore) for the languages/frameworks `python` and `nextjs`.
