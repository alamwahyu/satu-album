# Luma Album

Luma Album is an original disposable camera and shared event album web application. Hosts create private events, generate guest links or QR codes, and guests later capture browser photos without installing an app.

This repository is intentionally not a clone of Satualbum or any other service. Source code, naming, UI, copy, and architecture are original.

## Architecture

- Next.js App Router, React, TypeScript, Tailwind CSS
- shadcn-style local UI primitives
- PostgreSQL with Prisma ORM
- JWT session cookie authentication for Admin and Host
- Guest access prepared for tokenized no-login sessions
- Storage abstraction with local development provider and S3-compatible provider
- Image processor interface backed by Sharp for future queue/worker extraction

## Requirements

- Node.js 22+
- PostgreSQL 16+
- Optional: Docker and Docker Compose
- Optional: MinIO for local S3-compatible storage

## Installation

```bash
npm install
cp .env.example .env
```

Update `.env` with a real `AUTH_SECRET` of at least 32 characters.

`DEFAULT_PLAN_CODE` controls the plan assigned to newly created events while payment is still a placeholder. Local development uses `BASIC` by default.

## Database Migration

```bash
npm run db:migrate
npm run db:seed
```

Seed credentials:

- Admin: `admin@luma.test` / `Password123!`
- Host: `host@luma.test` / `Password123!`

## Run Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Run Tests

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Storage Setup

For development, use:

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_ROOT=./uploads
LOCAL_STORAGE_PUBLIC_URL=/uploads
```

For S3-compatible storage, set:

```env
STORAGE_PROVIDER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

Object keys follow:

```text
events/{eventId}/photos/{photoId}.jpg
events/{eventId}/thumbnails/{photoId}.jpg
```

## Docker

```bash
docker compose up --build
```

The compose file includes `app`, `postgres`, and `minio`.

## Implemented Phase

Phase 1 foundation:

- Next.js setup
- Prisma schema
- JWT authentication
- Host register/login/logout
- Host dashboard
- Create event
- Event detail
- QR generation with PNG/SVG download and link copy
- Admin overview
- Seed plans and film presets

Phase 2 guest foundation:

- Public guest event route at `/e/[slug]`
- Guest join without account
- Guest name requirement
- Optional event password validation
- Device id backed guest identity
- HttpOnly guest session cookie
- Event guest limit enforcement
- Guest camera route session guard at `/e/[slug]/camera`
- Guest gallery developing state at `/e/[slug]/gallery`
- Guest API under `/api/guest/events/[slug]`

Phase 3 camera and upload:

- Browser camera capture with `getUserMedia`
- Mobile-first disposable camera UI
- Client-side canvas resize/compress
- Fallback image upload
- Multipart upload endpoint
- Server-side Sharp processing and thumbnail generation
- Backend photo limit protection
- Local `/uploads` development route

Phase 4 reveal and gallery:

- Host reveal action
- Guest masonry gallery after reveal
- Hidden developing state before reveal
- Lightbox with metadata
- Guest gallery API

Phase 5 host management:

- Host guest list
- Event analytics panel
- Photos by hour chart
- Host photo moderation grid
- Favorite, hide, restore, soft delete
- Host photo filters
- Per-photo download/open controls
- Host guests/photos/analytics APIs

Phase 6 production foundation:

- Host ZIP export
- ZIP structure with `/photos`, `/thumbnails`, and optional `/by-guest`
- Download rate limiting
- Database-backed plan limit enforcement on event creation
- S3 presigned upload endpoint foundation
- Storage provider read abstraction for local and S3 objects
- Placeholder payment service and transaction creation path

## Known Limitations

- Selected bulk download UI, full payment provider integration, background queue, and offline retry are not completed yet.
- Rate limiting is currently in-memory and should be moved to Redis or a durable adapter for production.
- Local storage writes files but serving `/uploads` needs a static file route or reverse-proxy mapping in later upload work.
# satu-album
