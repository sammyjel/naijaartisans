import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyArtisansOfJob } from "@/lib/notifications";
import { track } from "@/lib/metrics";
import { revalidateFor } from "@/lib/cached-queries";
import { recordConversion } from "@/lib/attribution";
import { screenJobPost, holdReasonText, HELD } from "@/lib/job-screen";
import { alertHeldPost } from "@/lib/alerts";

// GET /api/jobs?category=plumbing&city=Lagos&mine=1
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const city = searchParams.get("city");
  const mine = searchParams.get("mine");

  const where = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (city) where.city = city;

  if (mine) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    where.customerId = user.id;
  } else {
    where.status = { not: HELD }; // held posts are not public
  }

  const jobs = await prisma.jobRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      customer: { select: { id: true, name: true, city: true } },
      _count: { select: { quotes: true } },
    },
  });

  return NextResponse.json({ jobs });
}

// POST /api/jobs  (customers post a job request)
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json();
  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  const city = (body.city || "").trim() || user.city;
  const categoryId = body.categoryId;
  const budget = body.budget ? parseInt(body.budget, 10) : null;

  if (!title || !description || !categoryId || !city)
    return NextResponse.json({ error: "Title, description, category and city are required." }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  // An artisan advertising themselves through this form is not a job. It is
  // saved as HELD: off the board, no artisan emailed, no "job posted" alert,
  // until the owner approves it in /admin. See lib/job-screen.js.
  const screen = screenJobPost({ posterRole: user.role, title, description });

  const job = await prisma.jobRequest.create({
    data: { title, description, city, categoryId, budget, customerId: user.id, ...(screen.hold ? { status: HELD } : {}) },
    include: { category: true },
  });

  if (screen.hold) {
    track("job_held", { jobId: job.id, reason: screen.reason });
    await alertHeldPost(job, user, holdReasonText(screen.reason)).catch(() => {});
    return NextResponse.json({ job, held: true }, { status: 201 });
  }

  track("job_posted", { jobId: job.id, categoryId, city, hasBudget: Boolean(budget) });

  // The day-long page TTL is only affordable because writes bust the cache.
  revalidateFor("job", ["/jobs", "/sitemap.xml"]);

  // Never throws — a job that saved must not fail because a marketing row did.
  await recordConversion({
    conversion: "job_posted",
    userId: user.id,
    subjectType: "JobRequest",
    subjectId: job.id,
    conversionPath: "/post-job",
  });

  // Notify matching artisans. Deliberately AFTER the create above and outside any
  // transaction: a notification must never go out for a job that failed to save.
  //
  // It is also deliberately awaited. On Vercel, work left running after the
  // response has been returned can be killed when the function suspends, so a
  // fire-and-forget here would silently drop exactly the emails this release
  // exists to send. notifyArtisansOfJob is bounded (at most 15 recipients, sent
  // in batches of 4) and never throws, so the cost is a slightly slower POST
  // rather than a failed one. A real queue is the right next step.
  const delivery = await notifyArtisansOfJob(job);

  // Returned so the client can tell the customer what actually happened instead
  // of promising notifications that were never created.
  return NextResponse.json(
    {
      job,
      notified: {
        artisans: delivery.created,
        eligible: delivery.eligible,
        emailed: delivery.emailed,
      },
    },
    { status: 201 }
  );
}
