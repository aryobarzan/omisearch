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

Environment variables have sensible defaults, and the RSA keypair for JWT signing and verification is generated automatically, sono manual .env setup is required.

## Stack

- **Backend:** FastAPI, SQLite, Docker
  - **Authentication:** token-based (JWT)
- **Frontend:** Next.js, React, Tailwind CSS

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
