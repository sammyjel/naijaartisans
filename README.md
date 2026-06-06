# NaijaArtisans 🇳🇬

An Armut-style **service marketplace for Nigeria**. Skilled artisans (plumbers, electricians, tailors, caterers, mechanics, etc.) register and list their services; customers browse, search by category & city, post jobs, and receive quotes.

Built with **Next.js (App Router)** + **Prisma** + **SQLite** (dev). One codebase serves both the web UI and a clean REST API your future **mobile app** can reuse.

---

## Features

**For customers**
- Register/login with **email or phone number**
- Browse & search artisans by **category** and **city**
- View artisan profiles, services, prices, and reviews
- **Post a job** for free and receive quotes
- Contact artisans (call / WhatsApp / email)
- Leave ratings & reviews

**For artisans**
- Register as an artisan with a bio
- **List services** with category, price range, and city
- Browse the **job board** and **send quotes** on open jobs
- Manage everything from a dashboard
- Get a public profile page customers can find

---

## Prerequisites

- **Node.js 18.18+** (LTS recommended) — https://nodejs.org
  Verify with: `node --version`

> Node isn't installed yet on this machine. Install the LTS, reopen your terminal, then continue below.

---

## Getting started

From the project folder (`naija-artisans`):

```bash
# 1. Install dependencies
npm install

# 2. Create the database, generate the client, and seed demo data
npm run setup

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:3000**

### Demo logins (password for all: `password123`)

| Role     | Login              |
|----------|--------------------|
| Customer | `customer@demo.com`|
| Artisan  | `musa@demo.com`    |

(You can also log in with the phone numbers seeded in `prisma/seed.mjs`.)

---

## Handy scripts

| Command            | What it does                                              |
|--------------------|----------------------------------------------------------|
| `npm run dev`      | Start the dev server                                      |
| `npm run setup`    | Generate client + create DB + seed (run once at start)   |
| `npm run db:seed`  | Re-run the seed                                           |
| `npm run db:reset` | **Wipe** the DB and re-seed (fresh start)                |
| `npm run db:studio`| Open Prisma Studio to inspect the database               |
| `npm run build`    | Production build                                          |
| `npm start`        | Run the production build                                  |

---

## Project structure

```
naija-artisans/
├─ prisma/
│  ├─ schema.prisma      # Data model (User, Category, Service, JobRequest, Quote, Review)
│  └─ seed.mjs           # Nigerian categories, cities & demo users
├─ src/
│  ├─ lib/               # prisma client, auth (JWT+bcrypt), formatting, constants
│  ├─ components/        # Navbar, AuthProvider, SearchBar, Stars, ReviewForm
│  └─ app/
│     ├─ api/            # REST API (auth, services, artisans, jobs, quotes, reviews)
│     ├─ page.js         # Home
│     ├─ browse/         # Find artisans (search + filters)
│     ├─ artisans/[id]/  # Public artisan profile
│     ├─ jobs/           # Job board + job detail + quoting
│     ├─ post-job/       # Post a job
│     ├─ services/new/   # Artisan: list a service
│     ├─ dashboard/      # Role-aware dashboard
│     ├─ login/ register/
│     └─ ...
└─ .env                  # DATABASE_URL + JWT_SECRET
```

---

## API overview (reusable by the mobile app)

| Method | Endpoint                  | Purpose                          |
|--------|---------------------------|----------------------------------|
| POST   | `/api/auth/register`      | Register (email or phone)        |
| POST   | `/api/auth/login`         | Login                            |
| POST   | `/api/auth/logout`        | Logout                           |
| GET    | `/api/auth/me`            | Current user                     |
| GET    | `/api/categories`         | List categories                  |
| GET    | `/api/services`           | Search services (`?category=&city=&q=`) |
| POST   | `/api/services`           | Create a service (artisan)       |
| GET    | `/api/artisans/:id`       | Artisan profile + services + reviews |
| GET    | `/api/jobs`               | List jobs (`?category=&city=&mine=1`) |
| POST   | `/api/jobs`               | Post a job (customer)            |
| GET/PATCH/DELETE | `/api/jobs/:id` | Job detail / close / delete      |
| POST   | `/api/jobs/:id/quotes`    | Send a quote (artisan)           |
| POST   | `/api/reviews`            | Leave a review                   |

Auth uses an http-only JWT cookie. For a mobile app you can switch this to a Bearer token with minimal changes in `src/lib/auth.js`.

---

## Going to production (Postgres)

1. In `prisma/schema.prisma`, change the datasource provider from `sqlite` to `postgresql`.
2. Set `DATABASE_URL` in `.env` to your Postgres connection string.
3. Set a strong `JWT_SECRET`.
4. Run `npx prisma migrate dev --name init` (or `prisma db push`), then `npm run db:seed`.
5. Deploy to Vercel / Render / Railway, etc.

---

## Next ideas

- SMS OTP verification for phone signups (e.g. Termii / Twilio)
- In-app chat between customer and artisan
- Image uploads (portfolio photos) via Cloudinary/S3
- Payments & escrow (Paystack / Flutterwave)
- Map / distance-based search
- Push notifications for the mobile app
```
