import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ShareButtons from "@/components/ShareButtons";
import ReviewForm from "@/components/ReviewForm";
import JobStatusToggle from "@/components/JobStatusToggle";
import JobQuotePanel from "@/components/JobQuotePanel";
import AcceptQuoteButton from "@/components/AcceptQuoteButton";
import JsonLd from "@/components/JsonLd";
import { naira, timeAgo } from "@/lib/format";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const job = await prisma.jobRequest.findUnique({
    where: { id: params.id },
    select: { title: true, city: true, status: true, description: true, category: { select: { name: true } } },
  });
  if (!job) return { title: "Job not found" };
  const title = `${job.title} — ${job.category.name} job in ${job.city}`;
  const description = (job.description || `Open ${job.category.name.toLowerCase()} job in ${job.city}. Send a quote on NaijaArtisans.`).slice(0, 160);
  const isOpen = job.status === "OPEN";
  return {
    title: isOpen ? title : `${title} (filled)`,
    description,
    alternates: { canonical: `/jobs/${params.id}` },
    // A job that has been hired for or completed is no longer a vacancy. Google's
    // job-posting guidelines want expired postings out of the index, and leaving
    // them in earns "expired job posting" warnings that can cost the rich result
    // across the WHOLE site, not just the stale page. The page stays reachable —
    // its quotes and outcome are useful to anyone who has the link — it simply
    // stops advertising itself as open work.
    robots: isOpen ? undefined : { index: false, follow: true },
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
          include: {
            artisan: { select: { id: true, name: true, city: true, phone: true, email: true } },
            deal: { select: { id: true, status: true } },
          },
        },
        // Loaded with the job rather than per quote: one query, not one per card.
        deals: { select: { id: true, status: true, artisanId: true } },
      },
    }),
  ]);

  if (!job) notFound();

  const isOwner = user?.id === job.customerId;
  const quotedArtisanIds = job.quotes.map((q) => q.artisan.id);

  // A job may only have one deal running at a time. While one does, the other
  // quotes must not offer a "Hire" button that the API would reject anyway.
  const activeDeal = job.deals.find((d) => d.status === "IN_PROGRESS" || d.status === "AWAITING_CONFIRMATION");
  const completedDeal = job.deals.find((d) => d.status === "COMPLETED");

  // JobPosting markup is emitted ONLY while the job is genuinely open.
  //
  // Once a quote is accepted the job becomes IN_PROGRESS and then COMPLETED, and
  // structured data still claiming an open vacancy is what Google reports as an
  // expired job posting. Before deals existed this barely happened — one job had
  // ever been closed — so every job page could safely carry the markup. Now a
  // job changes status every time somebody is hired, which makes this the normal
  // case rather than the edge case.
  //
  // validThrough is included so Google can expire the posting on its own if our
  // status change and its next crawl do not line up.
  const VACANCY_DAYS = 45;
  const jobLd =
    job.status === "OPEN"
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          datePosted: new Date(job.createdAt).toISOString(),
          validThrough: new Date(
            new Date(job.createdAt).getTime() + VACANCY_DAYS * 86400000
          ).toISOString(),
          employmentType: "CONTRACTOR",
          hiringOrganization: { "@type": "Organization", name: "NaijaArtisans", sameAs: SITE.url },
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.city, addressCountry: "NG" },
          },
          ...(job.budget
            ? { baseSalary: { "@type": "MonetaryAmount", currency: "NGN", value: { "@type": "QuantitativeValue", value: job.budget } } }
            : {}),
        }
      : null;

  return (
    <div className="container-page py-8">
      {jobLd && <JsonLd data={jobLd} />}
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
                {completedDeal
                  ? "✅ This job is complete. Rate the artisan below — your review is what other customers go on."
                  : activeDeal
                  ? "🔧 A transaction is in process. Track it and confirm completion from your dashboard."
                  : "👇 Pick a quote and hire the artisan. That starts the transaction and tracks it to completion."}
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
                    {/* Hiring: only the owner, only while no deal is running. */}
                    {isOwner && !q.deal && !activeDeal && !completedDeal && (
                      <AcceptQuoteButton
                        quoteId={q.id}
                        artisanName={q.artisan.name}
                        price={q.price}
                      />
                    )}
                    {q.deal && (
                      <p className="mt-3 text-sm font-semibold text-brand-700">
                        {q.deal.status === "COMPLETED"
                          ? "✅ Completed with this artisan"
                          : q.deal.status === "CANCELLED"
                          ? "Deal cancelled"
                          : q.deal.status === "AWAITING_CONFIRMATION"
                          ? "⏳ Says the work is done — confirm it on your dashboard"
                          : "🔧 Transaction in process"}
                      </p>
                    )}

                    {/* Rating is offered once the work is actually confirmed done. */}
                    {isOwner && q.deal?.status === "COMPLETED" && (
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
