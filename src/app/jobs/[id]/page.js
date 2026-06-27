import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ShareButtons from "@/components/ShareButtons";
import ReviewForm from "@/components/ReviewForm";
import JobStatusToggle from "@/components/JobStatusToggle";
import JobQuotePanel from "@/components/JobQuotePanel";
import JsonLd from "@/components/JsonLd";
import { naira, timeAgo } from "@/lib/format";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const job = await prisma.jobRequest.findUnique({
    where: { id: params.id },
    select: { title: true, city: true, description: true, category: { select: { name: true } } },
  });
  if (!job) return { title: "Job not found" };
  const title = `${job.title} — ${job.category.name} job in ${job.city}`;
  const description = (job.description || `Open ${job.category.name.toLowerCase()} job in ${job.city}. Send a quote on NaijaArtisans.`).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${params.id}` },
    openGraph: { title: `${title} | NaijaArtisans`, description, type: "article" },
  };
}

export default async function JobDetailPage({ params }) {
  const [user, job] = await Promise.all([
    getCurrentUser(),
    prisma.jobRequest.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        customer: { select: { id: true, name: true, city: true } },
        quotes: {
          orderBy: { createdAt: "desc" },
          include: { artisan: { select: { id: true, name: true, city: true, phone: true, email: true } } },
        },
      },
    }),
  ]);

  if (!job) notFound();

  const isOwner = user?.id === job.customerId;
  const quotedArtisanIds = job.quotes.map((q) => q.artisan.id);

  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: new Date(job.createdAt).toISOString(),
    employmentType: "CONTRACTOR",
    hiringOrganization: { "@type": "Organization", name: "NaijaArtisans", sameAs: SITE.url },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.city, addressCountry: "NG" },
    },
    ...(job.budget
      ? { baseSalary: { "@type": "MonetaryAmount", currency: "NGN", value: { "@type": "QuantitativeValue", value: job.budget } } }
      : {}),
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={jobLd} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", url: "/" },
          { name: "Job board", url: "/jobs" },
          { name: job.title, url: `/jobs/${job.id}` },
        ])}
      />
      <Link href="/jobs" className="text-sm text-gray-500 hover:text-brand-700">← Back to job board</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Job */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="badge">{job.category.icon} {job.category.name}</span>
              <span className={`text-xs font-semibold ${job.status === "OPEN" ? "text-brand-600" : "text-gray-400"}`}>
                {job.status}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>📍 {job.city}</span>
              {job.budget ? <span>💰 Budget {naira(job.budget)}</span> : null}
              <span>Posted by {job.customer.name}</span>
              <span className="text-gray-400">· {timeAgo(job.createdAt)}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-gray-700">{job.description}</p>

            {isOwner && <JobStatusToggle jobId={job.id} status={job.status} />}
          </div>

          {/* Quotes */}
          <div className="card p-6">
            <h2 className="text-lg font-bold">Quotes ({job.quotes.length})</h2>
            {isOwner && job.quotes.length > 0 && (
              <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                {job.status === "CLOSED"
                  ? "✅ Job done? Rate the artisans below — your review rewards great work and helps other customers."
                  : "⭐ Hired one of these artisans? You can rate them below once the work is done."}
              </div>
            )}
            <div className="mt-4 space-y-4">
              {job.quotes.length === 0 ? (
                <p className="text-gray-500">No quotes yet. Be the first artisan to respond!</p>
              ) : (
                job.quotes.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/artisans/${q.artisan.id}`} className="font-semibold text-brand-700 hover:underline">
                        {q.artisan.name}
                      </Link>
                      {q.price ? <span className="font-semibold">{naira(q.price)}</span> : <span className="text-sm text-gray-400">Price on request</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{q.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{q.artisan.city} · {timeAgo(q.createdAt)}</p>
                    {/* Owner sees contact details of quoting artisans */}
                    {isOwner && (
                      <div className="mt-2 flex gap-3 text-sm">
                        {q.artisan.phone && <a href={`tel:${q.artisan.phone}`} className="font-medium text-brand-700">📞 {q.artisan.phone}</a>}
                        {q.artisan.email && <a href={`mailto:${q.artisan.email}`} className="font-medium text-brand-700">✉️ Email</a>}
                      </div>
                    )}
                    {/* Owner can rate the artisan after the transaction */}
                    {isOwner && (
                      <details className="mt-3 border-t border-gray-100 pt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-700">⭐ Rate {q.artisan.name.split(" ")[0]}</summary>
                        <div className="mt-3">
                          <ReviewForm targetId={q.artisan.id} />
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          <JobQuotePanel
            jobId={job.id}
            status={job.status}
            customerId={job.customerId}
            quotedArtisanIds={quotedArtisanIds}
          />

          <div className="card p-6">
            <ShareButtons
              url={`${SITE.url}/jobs/${job.id}`}
              title={`${job.title} — ${job.category.name} job in ${job.city}`}
              label="Know an artisan for this job? Share 👇"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
