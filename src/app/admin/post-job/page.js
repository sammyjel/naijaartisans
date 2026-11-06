import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminPostJobForm from "@/components/AdminPostJobForm";
import { listSourcedJobs } from "@/lib/sourced-jobs";
import { whatsAppLink } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a job for a customer — Admin", robots: { index: false, follow: false } };

const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");

/** The WhatsApp message passing one artisan's quote on to the customer. */
function quoteMessage(job, q) {
  return (
    `Hello ${job.customer.name.split(" ")[0]}, this is NaijaArtisans about your job "${job.title}". ` +
    `${q.artisan.name}${q.artisan.verifiedAt ? " (✓ Verified)" : ""} has quoted${q.price ? " " + naira(q.price) : ""}: "${q.message}". ` +
    `You can call them on ${q.artisan.phone || "the number on their profile"}, and see their reviews and work photos here: ` +
    `https://naijaartisans.com/artisans/${q.artisan.id} . NaijaArtisans never asks you for money.`
  );
}

export default async function AdminPostJobPage() {
  if (!isAdmin()) return <AdminLogin />;
  const [categories, jobs] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listSourcedJobs(),
  ]);
  const quoted = jobs.filter((j) => j.quotes.length > 0).length;

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs posted for customers</h1>
        <Link href="/admin" className="btn-ghost">← Admin</Link>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">
        Posted here, a job alerts matching artisans exactly like one a customer posts themselves. Most of these customers won't
        log in, so their quotes are listed below with a WhatsApp button that sends the quote to the customer.
      </p>

      <AdminPostJobForm categories={categories} />

      <h2 className="mt-8 text-lg font-bold">Posted so far: {jobs.length} job(s), {quoted} with quotes</h2>
      <div className="mt-3 space-y-4">
        {jobs.length === 0 && <p className="text-sm text-gray-500">Nothing yet. Jobs you post above appear here.</p>}
        {jobs.map((j) => (
          <div key={j.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/jobs/${j.id}`} className="font-semibold text-brand-700 hover:underline">{j.title}</Link>
              <span className="text-xs text-gray-500">
                {j.category.name} · {j.city} · from {j.source} · {j.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {j.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Customer: {j.customer.name} · {j.customer.phone || "no phone"}{j.customer.email ? ` · ${j.customer.email} (emailed each quote)` : ""}
            </div>
            {j.quotes.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No quotes yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {j.quotes.map((q) => {
                  const wa = whatsAppLink(j.customer.phone, quoteMessage(j, q));
                  return (
                    <li key={q.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <Link href={`/artisans/${q.artisan.id}`} className="font-semibold text-brand-700 hover:underline">{q.artisan.name}</Link>
                          {q.artisan.verifiedAt && <span className="ml-1 text-green-700">✓</span>}
                          {" · "}{q.price ? naira(q.price) : "price on request"}{" · "}{q.artisan.phone || "no phone"}
                        </span>
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1 text-xs">Send to customer on WhatsApp</a>}
                      </div>
                      <p className="mt-1 text-gray-600">{q.message}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
