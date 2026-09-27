# Implementation plan — liquidity, performance, security, SEO

Written after auditing the repo (not assumed). Findings that shaped it:

## Audit findings

| Area | Reality found in the code |
|---|---|
| Framework | Next.js **14.2.35**, App Router, **JavaScript** (107 .js files, 0 .ts, `jsconfig.json`) |
| ORM / DB | Prisma 5.22, PostgreSQL (Neon), pooled `DATABASE_URL` + `DIRECT_URL` |
| Auth | Custom JWT in an httpOnly cookie; `getCurrentUser()` in `src/lib/auth.js` calls `cookies()` |
| Email | `src/lib/email.js` — Resend over plain HTTP, no SDK. `sendEmail()` / `emailConfigured()` |
| Operator alerts | `src/lib/alerts.js` (untracked WIP) wraps `sendEmail` for owner alerts |
| Blob | `@vercel/blob` via `src/lib/upload.js` (untracked WIP) |
| Notifications | **None.** No model, no table, no queue, no background jobs, no in-app inbox |
| Job posting | `POST /api/jobs` persists the job and returns. **No notification of any kind** |
| Reviews | `POST /api/reviews` lets any logged-in user review any artisan: no job link, no dedupe, no moderation, no aggregates, and the `Review` table has **no indexes at all** |
| Sitemap | `force-dynamic`; only OPEN jobs carry `lastModified`, which is why 8 of 174 URLs have one |
| Timestamps | `User`, `Service` and `Category` have **no `updatedAt`** — there is no honest lastmod source yet |
| Security headers | 4 exist in `next.config.mjs` but are **uncommitted**, so production serves only HSTS (that one comes from Vercel's domain setting). No CSP |
| Root layout | Does **not** read cookies — so marketing pages are dynamic purely by directive, not by necessity |

## Why production was `no-store` / cache MISS
Eleven route files declare `export const dynamic = "force-dynamic"`. Nothing else forces
dynamic rendering on the marketing pages — no `cookies()`, `headers()` or `no-store`
fetches in them. The directive alone is the cause, so it is safe to remove where the
content is genuinely public.

## Rendering decisions (Phase 5)

| Route | Decision | Reason |
|---|---|---|
| `/`, `/services`, `/services/[category]`, `/services/[category]/[city]`, `/artisans/[id]` | **ISR `revalidate = 3600`** | Public, no per-user data, no dynamic APIs |
| `/sitemap.xml` | **ISR `revalidate = 3600`** | Was needlessly per-request |
| `/browse` | **stays dynamic** | Reads `searchParams` (category/city/q/lat/lng) — cannot be static in Next 14 |
| `/jobs` | **stays dynamic** | Reads `searchParams` + live job state |
| `/jobs/[id]` | **stays dynamic** | Calls `getCurrentUser()` → `cookies()` |
| `/admin`, `/dashboard`, auth pages | **stay dynamic** | Private / authenticated |

`/browse` is deliberately **not** given a `revalidate` — adding one there would be the
cosmetic fix the brief warns against.

## CSP decision
A nonce-based CSP needs per-request values, which forces dynamic rendering and would
undo Phase 5 on every page. Since caching the 153 marketing pages is the higher-value
goal, CSP ships as a static policy that keeps `'unsafe-inline'` for `script-src` only,
and locks down everything else. Documented as a limitation, not hidden.

Hosts the policy must allow (found by grepping `src/`):
`*.tile.openstreetmap.org` + `unpkg.com` (Leaflet), `*.public.blob.vercel-storage.com`
(avatars/gallery), `js.paystack.co` / `api.paystack.co`, `pagead2.googlesyndication.com`
(AdSense), Vercel insights, `wa.me` (WhatsApp links).

## Order of work
1. Schema + idempotent SQL (owner runs it in Neon — I cannot, per project constraint)
2. Notifications: matching → records → email, idempotent
3. Reviews: eligibility, dedupe, aggregates, demo seeding
4. `/browse` social proof without N+1
5. ISR conversions
6. CSP + remaining headers
7. Sitemap `lastmod` from real timestamps
8. Tests (`node:test`, no new deps), observability, UX copy
