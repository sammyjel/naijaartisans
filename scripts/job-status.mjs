// Read-only. Follows one job through the marketplace: who was alerted, whether
// the alert emails landed, which artisans quoted, and whether a deal started.
//
//   node --env-file=.env scripts/job-status.mjs <jobId>
import { PrismaClient } from "@prisma/client";

const jobId = process.argv[2];
if (!jobId) {
  console.error("usage: node --env-file=.env scripts/job-status.mjs <jobId>");
  process.exit(1);
}

const prisma = new PrismaClient();

const job = await prisma.jobRequest.findUnique({
  where: { id: jobId },
  include: {
    customer: { select: { name: true, role: true, email: true, phone: true } },
    category: { select: { name: true } },
    quotes: {
      orderBy: { createdAt: "asc" },
      include: { artisan: { select: { name: true, phone: true } } },
    },
    deals: { select: { status: true, agreedPrice: true, createdAt: true, artisanId: true } },
  },
});

if (!job) {
  console.log("job not found");
  await prisma.$disconnect();
  process.exit(1);
}

const byEmail = await prisma.notification.groupBy({
  by: ["type", "emailStatus"],
  where: { jobRequestId: jobId },
  _count: true,
});
const read = await prisma.notification.count({ where: { jobRequestId: jobId, readAt: { not: null } } });

console.log(`job       ${job.title}  [${job.status}]`);
console.log(`category  ${job.category.name} / ${job.city}   budget ${job.budget ?? "-"}`);
console.log(`posted    ${job.createdAt.toISOString()}  by ${job.customer.name} (${job.customer.role})`);
console.log(`contact   email ${job.customer.email ? "yes" : "no"}, phone ${job.customer.phone ? "yes" : "no"}`);
console.log(`alerts    ${byEmail.map((r) => `${r.type}/${r.emailStatus}=${r._count}`).join("  ") || "none"}   read in-app: ${read}`);
console.log(`quotes    ${job.quotes.length}`);
for (const q of job.quotes) {
  console.log(`  - ${q.createdAt.toISOString()}  ${q.artisan.name}  price ${q.price ?? "-"}  phone ${q.artisan.phone ? "yes" : "no"}`);
}
console.log(`deals     ${job.deals.map((d) => `${d.status} ${d.agreedPrice ?? ""}`).join(", ") || "none"}`);

await prisma.$disconnect();
