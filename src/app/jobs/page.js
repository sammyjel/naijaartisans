import Link from "next/link";
import { prisma } from "@/lib/prisma";
import JobsFilters from "@/components/JobsFilters";
import JsonLd from "@/components/JsonLd";
import { naira, timeAgo } from "@/lib/format";
import { breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const { category, city } = searchParams;
  const cat = category ? await prisma.category.findUnique({ where: { slug: category } }) : null;
  const what = cat ? `${cat.name} jobs` : "Open jobs";
  const where = city ? ` in ${city}` : " in Nigeria";
  const title = `${what}${where} — Job board`;
  const description = `Browse open ${cat ? cat.name.toLowerCase() + " " : ""}jobs${city ? ` in ${city}` : " across Nigeria"} and send a quote to win the work on NaijaArtisans.`;

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (city) qs.set("city", city);
  const canonical = qs.toString() ? `/jobs?${qs.toString()}` : "/jobs";

  return { title, description, alternates: { canonical } };
}

export default async function JobsPage({ searchParams }) {
  const { category = "", city = "" } = searchParams;
  const where = {};
  if (category) where.category = { slug: category };
  if (city) where.city = city;

  const [categories, jobs] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.jobRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        customer: { select: { id: true, name: true, city: true } },
        _count: { select: { quotes: true } },
      },
    }),
  ]);

  return (
    <div className="container-page py-8">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Job board", url: "/jobs" }])} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Job board</h1>
          <p className="text-gray-500">Open jobs from customers. Send a quote to win the work.</p>
        </div>
        <Link href="/post-job" className="btn-primary">Post a job</Link>
      </div>

      <div className="mt-5">
        <JobsFilters categories={categories} category={category} city={city} />
      </div>

      <div className="mt-6 space-y-4">
        {jobs.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">No open jobs match your filters yet.</div>
        ) : (
          jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="card block p-5 transition hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="badge">{j.category.icon} {j.category.name}</span>
                <span className={`text-xs font-semibold ${j.status === "OPEN" ? "text-brand-600" : "text-gray-400"}`}>
                  {j.status}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{j.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{j.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>📍 {j.city}</span>
                {j.budget ? <span>💰 Budget {naira(j.budget)}</span> : null}
                <span>💬 {j._count.quotes} quote{j._count.quotes === 1 ? "" : "s"}</span>
                <span className="text-gray-400">· {timeAgo(j.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
