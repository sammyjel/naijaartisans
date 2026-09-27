// Read-only. Confirms which database these credentials point at, so a schema
// push is not aimed at an empty dev copy by mistake — or at production by
// surprise.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const host = (process.env.DATABASE_URL || "").match(/@([^/:?]+)/)?.[1] ?? "unknown";

const [users, artisans, categories, services, jobs, payments, leads] = await Promise.all([
  prisma.user.count(),
  prisma.user.count({ where: { role: "ARTISAN" } }),
  prisma.category.count(),
  prisma.service.count(),
  prisma.jobRequest.count(),
  prisma.payment.count(),
  prisma.lead.count(),
]);

console.log(`host        ${host}`);
console.log(`users       ${users}  (artisans ${artisans})`);
console.log(`categories  ${categories}`);
console.log(`services    ${services}`);
console.log(`jobs        ${jobs}`);
console.log(`payments    ${payments}`);
console.log(`leads       ${leads}`);

const newest = await prisma.user.findFirst({
  orderBy: { createdAt: "desc" },
  select: { createdAt: true },
});
console.log(`newest user ${newest ? newest.createdAt.toISOString().slice(0, 10) : "none"}`);

await prisma.$disconnect();
