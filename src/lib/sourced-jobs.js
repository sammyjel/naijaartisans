// Posting a job for a customer who agreed to it, and the owner's view of those
// jobs. Rules and validation live in sourced-jobs-rules.js (DB-free, tested).
//
// The customer gets a real CUSTOMER account so the job behaves like any other:
// artisans are alerted, quotes are recorded and, when an email was given, the
// customer is emailed each quote. Most of these customers will never log in, so
// listSourcedJobs() shows the owner every quote with the artisan's phone number
// to pass on by WhatsApp or a call.

import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { notifyArtisansOfJob } from "./notifications";
import { track } from "./metrics";
import { revalidateFor } from "./cached-queries";
import { checkOnBehalfJob, phoneVariants, SOURCING_CAMPAIGN, ON_BEHALF_MEDIUM } from "./sourced-jobs-rules";

/** The existing account for this phone or email, or a new CUSTOMER account. */
async function findOrCreateCustomer({ name, phone, email, city }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: { in: phoneVariants(phone) } }, ...(email ? [{ email }] : [])] },
    select: { id: true, suspendedAt: true },
  });
  if (existing) {
    if (existing.suspendedAt) throw Object.assign(new Error("suspended"), { code: "SUSPENDED" });
    return { id: existing.id, created: false };
  }
  // Nobody knows this password. A customer who gave an email can set their own
  // through "Forgot password"; one who did not is handled by the owner.
  const user = await prisma.user.create({
    data: { name, phone, email, city, role: "CUSTOMER", password: await hashPassword(randomBytes(24).toString("hex")) },
    select: { id: true },
  });
  return { id: user.id, created: true };
}

/**
 * @param {Record<string, unknown>} body the admin form
 * @returns {Promise<{ok:true, job:object, customerCreated:boolean, notified:object} | {ok:false, status:number, error:string}>}
 */
export async function postJobForCustomer(body) {
  const { data, problems } = checkOnBehalfJob(body);
  if (problems.length) return { ok: false, status: 400, error: problems.join(" ") };

  const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) return { ok: false, status: 400, error: "Pick a trade from the list." };

  let customer;
  try {
    customer = await findOrCreateCustomer(data);
  } catch (e) {
    if (e?.code === "SUSPENDED") return { ok: false, status: 400, error: "That phone or email belongs to a suspended account." };
    throw e;
  }

  const job = await prisma.jobRequest.create({
    data: {
      title: data.title,
      description: data.description,
      city: data.city,
      categoryId: category.id,
      budget: data.budget,
      customerId: customer.id,
    },
    include: { category: true },
  });

  track("job_posted", { jobId: job.id, categoryId: category.id, city: data.city, hasBudget: Boolean(data.budget), onBehalf: true });
  revalidateFor("job", ["/jobs", "/sitemap.xml"]);

  // Written directly rather than through recordConversion: that reads the
  // visitor's campaign cookie, and the visitor here is the owner, not the customer.
  await prisma.attribution
    .create({
      data: {
        conversion: "job_posted",
        source: data.source,
        medium: ON_BEHALF_MEDIUM,
        campaignTag: SOURCING_CAMPAIGN,
        conversionPath: "/admin/post-job",
        userId: customer.id,
        subjectType: "JobRequest",
        subjectId: job.id,
      },
    })
    .catch((e) => console.error("[sourced-jobs] attribution failed:", e?.message || e));

  // Same path as a customer-posted job: matching artisans plus the owner summary.
  const notified = await notifyArtisansOfJob(job);
  return { ok: true, job: { id: job.id, title: job.title }, customerCreated: customer.created, notified };
}

/** Jobs posted on customers' behalf, newest first, with quotes to pass on. */
export async function listSourcedJobs({ take = 50 } = {}) {
  const rows = await prisma.attribution.findMany({
    where: { medium: ON_BEHALF_MEDIUM, subjectType: "JobRequest" },
    orderBy: { createdAt: "desc" },
    take,
    select: { subjectId: true, source: true },
  });
  if (!rows.length) return [];
  const jobs = await prisma.jobRequest.findMany({
    where: { id: { in: rows.map((r) => r.subjectId) } },
    select: {
      id: true, title: true, city: true, status: true, createdAt: true,
      category: { select: { name: true } },
      customer: { select: { name: true, phone: true, email: true } },
      quotes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, price: true, message: true, createdAt: true, artisan: { select: { id: true, name: true, phone: true, verifiedAt: true } } },
      },
    },
  });
  const sourceById = new Map(rows.map((r) => [r.subjectId, r.source]));
  return jobs
    .map((j) => ({ ...j, source: sourceById.get(j.id) }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
