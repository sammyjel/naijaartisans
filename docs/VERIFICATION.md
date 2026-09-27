# Verification checklist

Everything here needs either a live database or a deployment, so none of it could
be run from the development environment this work was done in (the project's
`DATABASE_URL` is deliberately unavailable locally, and I cannot run Neon
migrations). Each step says what to expect, so a failure is unambiguous.

Run them in order. Step 0 is not optional.

---

## 0. Run the migration FIRST

The code in this release reads columns that do not exist yet. Deploying before
migrating will produce `column "ratingAverage" does not exist` on `/browse`.

1. Open the **Neon SQL Editor**.
2. Paste and run **`docs/migrations/2026-09-27-liquidity.sql`** in full.
3. Confirm it completes without error. It is idempotent — running it twice is safe.

Sanity check afterwards, in the same editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User' AND column_name IN ('updatedAt','ratingAverage','reviewCount');
-- expect 3 rows

SELECT to_regclass('"Notification"');           -- expect: Notification
SELECT COUNT(*) FROM "Review" WHERE "isDemo";   -- expect: 0 on production
```

Then deploy (`git push` → Vercel).

---

## 1. Job posted → artisan notified

The failure this release exists to fix: 5 of the first 9 jobs received no quote
because nothing told the artisans.

1. Log in as a **customer** and post a job in a city and category where at least
   one artisan lists a service (e.g. Plumbing / Lagos).
2. On submit, the confirmation must state a **real number**:
   *"We notified N matching artisans."* If no artisan matched it must say so
   instead — it must never promise notifications it did not create.
3. Check the artisan's email inbox. Subject: *"New plumbing job in Lagos"*.
4. Verify in the database:

```sql
SELECT "userId", "emailStatus", "emailAttempts", "dedupeKey"
FROM "Notification" WHERE "jobRequestId" = '<job id>';
```

Expect one row per notified artisan, `emailStatus = 'SENT'`.
`'SKIPPED'` with `emailError = 'RESEND_API_KEY not set'` means email is not
configured — the in-app notification still works.

### Idempotency

Post the **same job twice** (or replay the POST). Then:

```sql
SELECT "dedupeKey", COUNT(*) FROM "Notification"
GROUP BY "dedupeKey" HAVING COUNT(*) > 1;
```

Expect **zero rows**. No artisan may be emailed twice for one job.

### A failed job must notify nobody

Post a job with a deliberately invalid `categoryId` via the API. Expect a 400 and
**no** new `Notification` rows.

---

## 2. Artisan opens the job → quote → customer notified

1. Log in as the notified **artisan** → `/dashboard`. The notification panel is the
   first thing on the page, with a **New** badge and a *"View job →"* link.
2. Click it. It must land directly on that job, and the badge must clear.
3. Submit a quote.
4. The **customer** must now receive an email (*"You have a new quote"*) and see a
   notification on their own dashboard.

```sql
SELECT type, title, "emailStatus" FROM "Notification" WHERE type = 'NEW_QUOTE';
```

---

## 3. Review → rating appears on /browse

1. As that customer, open the artisan's profile and leave a review. It should be
   **allowed**, because the artisan quoted on your job.
2. Try to review a **different** artisan who never quoted for you. Expect a refusal:
   *"You can review an artisan after they have quoted on a job you posted."*
3. Try to review the same artisan **twice**. Expect 409 *"already reviewed"*.
4. Check the aggregate was written:

```sql
SELECT name, "ratingAverage", "reviewCount" FROM "User" WHERE id = '<artisan id>';
```

5. Open `/browse`. That artisan's card must show the avatar, the star rating, the
   review count and a quoted excerpt.
6. An artisan with **no** reviews must show **"New · no reviews yet"** — never
   `⭐ 5.0 (0 reviews)`.

---

## 4. Marketing page → CDN → cache HIT

Baseline measured on production **before** this release, for comparison:

```
$ curl -sI https://naijaartisans.com/
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
X-Vercel-Cache: MISS          # 4 consecutive requests, all MISS
TTFB: 0.63s – 0.93s
```

After deploying, check a page from each ISR family. **Request each one twice** —
the first request populates the cache.

```bash
for url in \
  https://naijaartisans.com/ \
  https://naijaartisans.com/services \
  https://naijaartisans.com/services/plumbing \
  https://naijaartisans.com/services/plumbing/lagos \
  https://naijaartisans.com/sitemap.xml
do
  echo "== $url"
  curl -s -o /dev/null -D - "$url" | grep -iE "cache-control|x-vercel-cache|age:"
  curl -s -o /dev/null -D - "$url" | grep -iE "x-vercel-cache"   # second hit
  curl -s -o /dev/null -w "   ttfb=%{time_starttransfer}s\n" "$url"
done
```

Expect on the **second** request:

- `X-Vercel-Cache: HIT` (or `STALE` while revalidating)
- `Cache-Control: s-maxage=3600, stale-while-revalidate` — **not** `no-store`
- TTFB well below the 0.63–0.93s baseline

Then confirm the pages that must **not** be cached still are not:

```bash
for url in /browse /jobs /dashboard /api/categories; do
  echo "== $url"; curl -sI "https://naijaartisans.com$url" | grep -i "cache-control"
done
# every one must contain no-store
```

`/browse` reading `searchParams` is why it stays dynamic. That is intentional.

### Revalidation

Change an artisan's profile, then reload their `/artisans/<id>` page. It may serve
the previous version for up to an hour — that is ISR working. To publish sooner,
redeploy or add on-demand `revalidatePath`.

---

## 5. Security headers

```bash
curl -sI https://naijaartisans.com/ | grep -iE \
 "content-security-policy|x-content-type|referrer-policy|permissions-policy|strict-transport|x-frame|cross-origin"
```

All eight must be present. Then confirm nothing broke — CSP failures are silent
except in the browser console:

- [ ] `/artisans/<id>` — the **Leaflet map renders** (tiles from openstreetmap.org, marker icons from unpkg.com)
- [ ] `/browse` — **avatars load** (Vercel Blob)
- [ ] `/pricing` → Paystack checkout **opens and completes**
- [ ] Login, register and password reset still work
- [ ] Avatar and portfolio **upload** still work
- [ ] Vercel Analytics still records a pageview
- [ ] Browser console shows **no** `Refused to load…` CSP violations

If a CSP violation appears, the console names the blocked host: add it to the
matching directive in `next.config.mjs` rather than removing the policy.

---

## 6. Sitemap lastmod

```bash
curl -s https://naijaartisans.com/sitemap.xml -o /tmp/sm.xml
echo "urls:     $(grep -c '<loc>' /tmp/sm.xml)"
echo "lastmods: $(grep -c '<lastmod>' /tmp/sm.xml)"
grep -o '<lastmod>[^<]*' /tmp/sm.xml | sort -u | head
```

Expect:

- URL count unchanged (~174) — no URL may disappear
- `lastmod` count risen from **8** to roughly **165** (all but the ~13
  hand-written static pages, which correctly have none)
- Dates spread across real values, **not** all equal to today
- Every value a valid ISO 8601 timestamp

Then validate in **Google Search Console** → Sitemaps → resubmit, and confirm no
parse errors.

---

## 7. Demo data (staging only)

Never run this against production.

```bash
npm run seed:demo          # refuses unless the DB looks local/staging
npm run seed:demo:clean    # removes every [DEMO] row
```

On staging, confirm demo reviews render with a **"Sample"** label, and that the
`[DEMO] Emeka Nwosu` profile — seeded deliberately without reviews — shows
"New · no reviews yet".

---

## 8. Funnel observability

In **Vercel → Logs**, filter for `[funnel]`. Posting one job should emit:

```
[funnel] {"event":"job_posted",...}
[funnel] {"event":"job_match_evaluated","eligible":N,...}
[funnel] {"event":"notifications_created","created":N,...}
[funnel] {"event":"notification_email","emailed":N,...}
```

The one to alert on is `job_zero_match` (logged at warn level): a job that reached
nobody. It is invisible to the customer, whose job looks posted either way.

To find jobs still getting no quotes:

```sql
SELECT j.id, j.title, j.city, COUNT(q.id) AS quotes,
       (SELECT COUNT(*) FROM "Notification" n WHERE n."jobRequestId" = j.id) AS notified
FROM "JobRequest" j LEFT JOIN "Quote" q ON q."jobRequestId" = j.id
GROUP BY j.id ORDER BY j."createdAt" DESC;
```

`notified > 0` with `quotes = 0` is now a *response-rate* problem, not a
notification bug. That is the distinction that was impossible to make before.

---

## 9. Stuck emails

If Resend was down during a job post, the notifications are recoverable — they are
rows, not lost events:

```sql
SELECT COUNT(*) FROM "Notification"
WHERE "emailStatus" IN ('PENDING','FAILED') AND "emailAttempts" < 3;
```

`retryPendingNotificationEmails()` in `src/lib/notifications.js` drains them. It is
safe to call repeatedly and is ready to wire to a cron job; nothing schedules it
yet.
