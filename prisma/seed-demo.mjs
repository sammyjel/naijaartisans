// Demo/staging seed — synthetic artisans, customers and reviews.
//
//   npm run seed:demo          create the demo set
//   npm run seed:demo:clean    remove every trace of it
//
// ── WHY IT WORKS THIS WAY ──────────────────────────────────────────────────
//
// naijaartisans.com is a LIVE marketplace with real artisans on it. Two rules
// follow from that, and they shape everything below.
//
// 1. NO REAL ARTISAN EVER RECEIVES A SEEDED REVIEW.
//    The obvious way to demo social proof is to attach glowing reviews to the
//    60 real artisans already listed. That would be fabricating customer
//    feedback about identifiable real people and publishing it under their
//    names. So this seed creates its OWN synthetic artisans and reviews only
//    those. Real rows are never read or written.
//
// 2. IT REFUSES TO RUN AGAINST PRODUCTION BY DEFAULT.
//    A seed script that can be pointed at the production database by a stray
//    DATABASE_URL is a matter of when, not if. This one checks the host and
//    stops unless SEED_DEMO_CONFIRM=yes is set explicitly.
//
// Every row is identifiable three ways over: names are prefixed [DEMO], emails
// are @demo.invalid (a reserved TLD that cannot receive mail or collide with a
// real address), and reviews carry isDemo = true so the UI labels them "Sample"
// and the genuine aggregates exclude them.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL_DOMAIN = "demo.invalid";
const DEMO_PREFIX = "[DEMO]";
// bcrypt hash of a string nobody is told; these accounts are not meant to be
// logged into, and leaving the column blank would break the NOT NULL constraint.
const UNUSABLE_PASSWORD = "$2a$10$ThisIsADemoAccountAndCannotBeUsedToLogIn000000000000";

/** Refuses to touch anything that looks like the production database. */
function assertSafeTarget() {
  const url = process.env.DATABASE_URL || "";
  if (!url) {
    console.error("DATABASE_URL is not set. Nothing to do.");
    process.exit(1);
  }

  const confirmed = (process.env.SEED_DEMO_CONFIRM || "").toLowerCase() === "yes";
  const looksLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)/.test(url);
  const looksStaging = /(staging|preview|dev|test|branch)/i.test(url);

  if (looksLocal || looksStaging || confirmed) {
    if (confirmed && !looksLocal && !looksStaging) {
      console.warn("!! SEED_DEMO_CONFIRM=yes — writing demo rows to a NON-local database.");
    }
    return;
  }

  console.error(
    [
      "",
      "REFUSING TO SEED.",
      "",
      "DATABASE_URL does not look like a local or staging database, and this script",
      "writes synthetic artisans and reviews. On the production database that would",
      "put fake listings in a live marketplace.",
      "",
      "If you are certain, re-run with:   SEED_DEMO_CONFIRM=yes npm run seed:demo",
      "",
    ].join("\n")
  );
  process.exit(1);
}

// Synthetic artisans, spread across categories and cities so /browse has
// something varied to render. Slugs must exist in prisma/seed.mjs.
const DEMO_ARTISANS = [
  {
    key: "demo-plumber-lagos",
    name: `${DEMO_PREFIX} Chinedu Okafor`,
    city: "Lagos",
    categorySlug: "plumbing",
    bio: "Sample profile used for testing and screenshots. Not a real artisan.",
    service: { title: "Leak repairs, pipe work and installations", priceMin: 15000, priceMax: 120000 },
    reviews: [
      { rating: 5, comment: "Arrived on time and fixed the leak in under an hour. Clean work." },
      { rating: 5, comment: "Explained the problem clearly and charged exactly what he quoted." },
      { rating: 4, comment: "Good job overall, though he arrived about an hour later than agreed." },
    ],
  },
  {
    key: "demo-electrician-abuja",
    name: `${DEMO_PREFIX} Fatima Bello`,
    city: "Abuja",
    categorySlug: "electrical",
    bio: "Sample profile used for testing and screenshots. Not a real artisan.",
    service: { title: "House wiring, sockets and fault finding", priceMin: 20000, priceMax: 250000 },
    reviews: [
      { rating: 5, comment: "Rewired two rooms neatly and tested everything before leaving." },
      { rating: 4, comment: "Knew exactly what the fault was. Would use again." },
    ],
  },
  {
    key: "demo-tailor-ibadan",
    name: `${DEMO_PREFIX} Adebayo Ogunlesi`,
    city: "Ibadan",
    categorySlug: "tailoring",
    bio: "Sample profile used for testing and screenshots. Not a real artisan.",
    service: { title: "Native wear, suits and alterations", priceMin: 8000, priceMax: 90000 },
    reviews: [
      { rating: 5, comment: "The fit was perfect first time and it was ready two days early." },
      { rating: 5, comment: "Took my measurements carefully and sent photos before finishing." },
      { rating: 3, comment: "Nice finishing but the delivery date slipped by a week." },
    ],
  },
  {
    key: "demo-ac-portharcourt",
    name: `${DEMO_PREFIX} Blessing Eze`,
    city: "Port Harcourt",
    categorySlug: "ac-refrigeration",
    bio: "Sample profile used for testing and screenshots. Not a real artisan.",
    service: { title: "AC servicing, gassing and installation", priceMin: 12000, priceMax: 70000 },
    reviews: [{ rating: 5, comment: "Serviced three units and the cooling improved immediately." }],
  },
  {
    // Deliberately review-free: this is how we verify /browse shows
    // "New · no reviews yet" instead of an invented 5.0 (0 reviews).
    key: "demo-carpenter-enugu",
    name: `${DEMO_PREFIX} Emeka Nwosu`,
    city: "Enugu",
    categorySlug: "carpentry",
    bio: "Sample profile with NO reviews — used to check the empty rating state.",
    service: { title: "Wardrobes, doors and fitted furniture", priceMin: 25000, priceMax: 400000 },
    reviews: [],
  },
];

const DEMO_CUSTOMERS = [
  `${DEMO_PREFIX} Ngozi A.`,
  `${DEMO_PREFIX} Tunde B.`,
  `${DEMO_PREFIX} Amina S.`,
];

const demoEmail = (key) => `${key}@${DEMO_EMAIL_DOMAIN}`;

async function seed() {
  assertSafeTarget();

  // Customers first — they author the reviews.
  const customers = [];
  for (let i = 0; i < DEMO_CUSTOMERS.length; i += 1) {
    const key = `demo-customer-${i + 1}`;
    const c = await prisma.user.upsert({
      where: { email: demoEmail(key) },
      update: { name: DEMO_CUSTOMERS[i] },
      create: {
        name: DEMO_CUSTOMERS[i],
        email: demoEmail(key),
        password: UNUSABLE_PASSWORD,
        role: "CUSTOMER",
        city: "Lagos",
      },
    });
    customers.push(c);
  }
  console.log(`  ${customers.length} demo customers`);

  let artisanCount = 0;
  let reviewCount = 0;
  let skipped = 0;

  for (const spec of DEMO_ARTISANS) {
    const category = await prisma.category.findUnique({ where: { slug: spec.categorySlug } });
    if (!category) {
      console.warn(`  ! category "${spec.categorySlug}" not found — run npm run db:seed first. Skipping ${spec.name}.`);
      skipped += 1;
      continue;
    }

    const artisan = await prisma.user.upsert({
      where: { email: demoEmail(spec.key) },
      update: { name: spec.name, city: spec.city, bio: spec.bio },
      create: {
        name: spec.name,
        email: demoEmail(spec.key),
        password: UNUSABLE_PASSWORD,
        role: "ARTISAN",
        city: spec.city,
        bio: spec.bio,
      },
    });
    artisanCount += 1;

    // One service so the artisan appears on /browse and the city landing pages.
    const existingService = await prisma.service.findFirst({
      where: { artisanId: artisan.id, categoryId: category.id },
      select: { id: true },
    });
    if (!existingService) {
      await prisma.service.create({
        data: {
          title: spec.service.title,
          description: `${spec.bio} Listed in ${spec.city}.`,
          priceMin: spec.service.priceMin,
          priceMax: spec.service.priceMax,
          city: spec.city,
          artisanId: artisan.id,
          categoryId: category.id,
        },
      });
    }

    // Reviews. The unique (authorId, targetId) index caps this at one review per
    // demo customer per demo artisan, which is also why the specs above never
    // list more reviews than there are demo customers.
    for (let i = 0; i < spec.reviews.length && i < customers.length; i += 1) {
      const r = spec.reviews[i];
      await prisma.review.upsert({
        where: { authorId_targetId: { authorId: customers[i].id, targetId: artisan.id } },
        update: { rating: r.rating, comment: r.comment, isDemo: true },
        create: {
          rating: r.rating,
          comment: r.comment,
          isDemo: true, // ← excluded from genuine aggregates, labelled in the UI
          authorId: customers[i].id,
          targetId: artisan.id,
        },
      });
      reviewCount += 1;
    }

    // Aggregates for DEMO ARTISANS ONLY.
    //
    // src/lib/reviews.js deliberately excludes isDemo rows, so demo reviews can
    // never produce a public star rating on a real profile. But a staging site
    // still needs to be able to show the rating UI, so we write the aggregate
    // here — on synthetic artisans, from their own synthetic reviews. No real
    // artisan's row is touched by this script at any point.
    const agg = await prisma.review.aggregate({
      where: { targetId: artisan.id },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const cnt = agg._count._all;
    await prisma.user.update({
      where: { id: artisan.id },
      data: {
        reviewCount: cnt,
        ratingAverage: cnt > 0 ? Math.round(agg._avg.rating * 100) / 100 : null,
      },
    });
  }

  console.log(`  ${artisanCount} demo artisans, ${reviewCount} demo reviews${skipped ? `, ${skipped} skipped` : ""}`);
  console.log("\nDemo data seeded. Every row is named [DEMO], uses an @demo.invalid");
  console.log("address, and its reviews carry isDemo = true.");
  console.log("Remove it all with: npm run seed:demo:clean");
}

async function clean() {
  assertSafeTarget();

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const ids = demoUsers.map((u) => u.id);

  if (ids.length === 0) {
    console.log("  no demo rows found.");
    return;
  }

  // Reviews and services cascade from User, but delete explicitly so the counts
  // reported are real rather than assumed.
  const reviews = await prisma.review.deleteMany({
    where: { OR: [{ authorId: { in: ids } }, { targetId: { in: ids } }] },
  });
  const services = await prisma.service.deleteMany({ where: { artisanId: { in: ids } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`  removed ${users.count} demo users, ${services.count} services, ${reviews.count} reviews`);
}

const mode = process.argv.includes("--clean") ? "clean" : "seed";
console.log(mode === "clean" ? "Removing demo data…" : "Seeding demo data…");

(mode === "clean" ? clean() : seed())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
