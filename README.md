# Omisearch

## Overview

Web application that makes tabular omics **differential gene expression (DGE)** analysis and **gene–gene interaction network** exploration accessible to non-tech savvy users.

- Users can upload a gene expression matrix and sample annotations CSV.
  - Alternatively, they can use the built-in simulated dataset.
- The output of the statistical tests can be filtered, sorted and exported.
- The user can also expore interactions via color-coded network graphs, powered by Cytoscape.js interaction clusters.

## Getting Started

This monorepo uses **Docker** to start up both the backend and frontend using a single command:

```bash
docker compose up --build -d
```

Afterwards, you can access the app:

- `localhost:3000`: Next.js frontend
  - A demo user is seeded automatically for you to login with:
    - _username:_ `demo`
    - _password:_ `demo1234`
- `localhost:8000`: FastAPI backend, e.g., `localhost:8000/docs` for the generated OpenAPI documentation.

Environment variables have sensible defaults, and the RSA keypair for JWT signing and verification is generated automatically, so no manual .env setup is required.

## Stack

- **Backend:** FastAPI (Python 3.15)
  - **Database:** SQLite, SQLAlchemy (ORM)
  - **Statistical testing:** `pandas`, `scipy`, `statsmodels` Python packages.
  - **Authentication:** RS256 JWT (via JWKS), password hashing with Argon2 (`pwdlib`)
- **Frontend:** Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS
  - **Authentication:** `jose` for JWT signature verification
  - **Form validation:** `react-hook-form`, `zod`
  - **Network graph visualization:** `cytoscape.js`
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)

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
- On success, the returned JWT is stored in an `httpOnly` cookie (`token`, `sameSite: "lax"`, 24-hour `maxAge`, `secure` gated by `COOKIE_SECURE`) so client-side JavaScript cannot read it. Logging out deletes the cookie and redirects to `/login`.
- Route protection runs in `proxy.ts` using `jose`'s `createRemoteJWKSet` to fetch the backend's public key from `/.well-known/jwks.json` and verify the RS256 JWT signature before protected pages render, redirecting unauthenticated requests to `/login` (and already-authenticated users away from `/login` and `/register`).
- Authenticated server-side API calls go through an `apiFetch` helper (`app/lib/api.ts`) that reads the `token` cookie and attaches it as an `Authorization: Bearer <token>` header.

**Note:** similar to the backend, the frontend auth flow was adapted from my past [Next.js project](https://github.com/aryobarzan/photo-classification-nextjs), with several changes for this project:

- Switched `proxy.ts` from a static `JWT_PUBLIC_KEY` env var (`importSPKI`) to `createRemoteJWKSet` against FastAPI's `/.well-known/jwks.json`, so no manual public-key copying is required.
- Gated the cookie `Secure` flag on `COOKIE_SECURE=true` instead of `NODE_ENV === "production"`, so local plain-HTTP Docker testing works.
- Removed role/admin logic (`role` in response schemas, `isAdmin()` in `session.ts`, and admin dashboard/profile routes), simplifying `getUser()` to return a plain username string (`string | null`).
- Updated auth calls from `/users/*` to `/auth/*` and dropped unused packages (`i18n-iso-countries`, `swr`).
- Replaced custom CSS classes and Material Symbols icons with Tailwind CSS utility classes.
- Removed top-level `process.env` throws in `app/lib/config.ts` and `proxy.ts` (falling back safely at build time) so `next build` succeeds cleanly inside Docker without requiring runtime environment variables.

### CSV Input Formats

All CSV files are decoded with `utf-8-sig` (handling Excel UTF-8 BOM headers cleanly) and capped at 10 MB per upload. Sample simulated files are bundled in `sample_data/` (reproducible via `python sample_data/generate_sample_data.py`, `seed=1`, using [MSigDB Hallmark gene symbols](https://www.gsea-msigdb.org/gsea/msigdb/human/collections.jsp#H) and [STRING-style confidence scores](https://string-db.org/help//getting_started/#data-settings)).

1. **Gene Expression Matrix (`expression.csv`)** — genes as rows (first column), sample IDs as columns:
   ```csv
   gene,CTRL_1,CTRL_2,TRTD_1,TRTD_2
   ABCA1,7.6582,7.9428,9.2662,9.3827
   ABI1,9.1204,8.8750,7.0112,6.9540
   ```
2. **Sample Annotations (`annotations.csv`)** — required columns `sample,group`, exactly 2 distinct groups with ≥ 2 samples per group:
   ```csv
   sample,group
   CTRL_1,control
   CTRL_2,control
   TRTD_1,treated
   TRTD_2,treated
   ```
3. **Gene–Gene Interactions (`interactions.csv`)** — required columns `gene_a,gene_b` plus an optional numeric `score` (e.g., STRING combined confidence score in `0.0–1.0`):
   ```csv
   gene_a,gene_b,score
   ABCA1,ABI1,0.803
   ABCA1,ATP5PO,0.728
   ```

### Statistical Methodology & Network Filtering

- **Reference group selection:** Recognizable control aliases (`control`, `ctrl`, `untreated`, `vehicle`, `normal`, `wt`, case-insensitive) are automatically selected as `group_a` (baseline) so positive `log2_fold_change` means up-regulated in `group_b`. Otherwise groups sort alphabetically (and can be overridden via `reference_group`).
- **Fold change (`is_log2` toggle):**
  - `is_log2 = true` (default): `mean(group_b) - mean(group_a)`.
  - `is_log2 = false` (linear scale, non-negative values): `log2((mean(group_b) + 1e-6) / (mean(group_a) + 1e-6))`.
- **Significance testing:**
  - **Welch's t-test** (`welch_t`, default): Parametric two-sample t-test (`equal_var=False`), robust to unequal group variances.
  - **Mann–Whitney U** (`mann_whitney`): Non-parametric two-sided rank test, robust to non-normal distributions and outliers.
  - Zero-variance / constant genes are handled safely: `p = 1.0` when identical across groups and `p = 0.0` under Welch's t-test for distinct constant levels.
- **Multiple testing correction:** **Benjamini–Hochberg FDR** (`statsmodels.stats.multitest.multipletests(..., method="fdr_bh")`), producing `adjusted_p_value` (`padj`).
- **Interaction network:** Filters uploaded or sample edges to pairs where both genes meet `padj <= padj_threshold` and `|log2FC| >= lfc_threshold` (plus optional `min_score`), deduplicates undirected edges (retaining max score), drops self-loops, and renders in [Cytoscape.js](https://cytoscape.org/) with blue → neutral → red `log2FC` coloring.

### Database

A lightweight **SQLite** database is used for storage (`users` and `analysis_runs`), stored as a _.db_ file inside the backend itself (`./data/omisearch.db`). Raw expression/annotation CSVs and serialized JSON results are stored on `AnalysisRun` so runs can be re-executed with different statistical options without re-uploading. The forward-looking alternative would be a dedicated PostgreSQL database hosted as a separate Docker service, though given the scope of this project, that would be overkill. My past [FastAPI project](https://github.com/aryobarzan/photo_classification-fastapi), from which I am re-using the authentication and user schema code, relied on a PostgreSQL database.

### Testing

#### Backend

The `pytest` package runs both pure-Python analysis unit tests and FastAPI integration tests (backed by isolated per-test SQLite databases) without requiring Docker:

```bash
cd backend
uv run pytest -v
```

Test coverage (**38 tests** across `backend/tests/analysis/` and `backend/tests/api/`):

- **Analysis unit tests (`backend/tests/analysis/` — 31 tests):**
  - **DGE (`test_dge.py`, 19 tests):** Welch's t-test, Mann–Whitney U, constant/zero-variance genes, linear-scale `log2FC` with pseudocount, Benjamini–Hochberg FDR vs. `statsmodels`, control-alias ordering & `reference_group` override, 13 `DGEValidationError` cases, and `sample_data/` integration.
  - **Interaction Network (`test_network.py`, 12 tests):** Threshold filtering, undirected edge deduplication (max score), self-loop removal, `include_isolated`, `min_score`, 2-column edge lists without `score`, 7 `NetworkValidationError` cases, and `sample_data/` monotonic pruning.
- **API integration tests (`backend/tests/api/` — 7 tests):**
  - `test_auth.py`: `/health`, `/.well-known/jwks.json`, seeded `demo` login, registration, `409` duplicate conflict, `401` invalid credentials & unauthenticated guards.
  - `test_analyses.py`: CSV upload, DGE run & Mann–Whitney re-run, summary list vs. detail results, `auto_run` validation, failed pending runs, and cross-user `404` isolation.
  - `test_network_api.py`: `POST /analyses/sample` + `POST /analyses/{id}/network` (`use_sample=true`, custom edge upload, and `400` error cases).

#### Frontend

```bash
cd frontend
pnpm lint && pnpm build
```

Both the backend test suite and frontend lint/build run automatically on every push and pull request via GitHub Actions, with the jobs defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Environment Variables

All environment variables are optional and have defaults so `docker compose up --build` works without requiring an `.env` file:

| Variable               | Service  | Default                                                          | Fallback Behavior                                         | Purpose                                                                              |
| ---------------------- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`         | Backend  | `sqlite:///./data/omisearch.db`                                  | static default (file/folder created on startup)           | SQLAlchemy database connection URL                                                   |
| `JWT_PRIVATE_KEY_PATH` | Backend  | _N/A_                                                            | ephemeral RSA-2048 keypair generated in memory on startup | Optional path to a persistent RSA private key PEM file for RS256 signing             |
| `DEMO_USERNAME`        | Backend  | `demo`                                                           | static default (empty disables seeding)                   | Username of the demo account seeded on startup                                       |
| `DEMO_PASSWORD`        | Backend  | `demo1234`                                                       | static default (empty disables seeding)                   | Password of the demo account seeded on startup                                       |
| `SAMPLE_DATA_DIR`      | Backend  | `../sample_data` (local) / `/sample_data` (Docker)               | static default                                            | Directory containing bundled `expression.csv`, `annotations.csv`, `interactions.csv` |
| `API_URL`              | Frontend | `http://backend:8000` (Docker) / `http://localhost:8000` (local) | static default                                            | Base URL used by Next.js server code and `proxy.ts` to reach FastAPI                 |
| `COOKIE_SECURE`        | Frontend | `false`                                                          | static default                                            | Set to `true` when serving over HTTPS to mark the `token` cookie as `Secure`         |

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
