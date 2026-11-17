import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminMessageForm from "@/components/AdminMessageForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email a customer — Admin", robots: { index: false, follow: false } };

/** A ready-to-edit draft. For a job with no quotes, it says how many artisans heard about it. */
function draft(job, alerted) {
  const first = (job.customer?.name || "there").split(" ")[0];
  const opening = `Hi ${first},\n\nThis is NaijaArtisans about your ${job.category?.name?.toLowerCase() || ""} job in ${job.city} ("${job.title}").`;
  const middle =
    job._count.quotes === 0
      ? `\n\nWe sent it to ${alerted} artisan${alerted === 1 ? "" : "s"} on the site, but nobody has quoted yet. Jobs with a clear budget get quotes much faster. If you can tell us a budget or rate, we will update the job for you.`
      : `\n\nYou have ${job._count.quotes} quote${job._count.quotes === 1 ? "" : "s"} on your job. Log in to NaijaArtisans to see them and contact the artisan.`;
  return opening + middle + "\n\nThank you,\nNaijaArtisans";
}

export default async function AdminMessagePage({ searchParams }) {
  if (!isAdmin()) return <AdminLogin />;
  const id = String(searchParams?.job || "");
  const job = id
    ? await prisma.jobRequest.findUnique({
        where: { id },
        select: {
          id: true, title: true, city: true,
          category: { select: { name: true } },
          customer: { select: { name: true, email: true } },
          _count: { select: { quotes: true, notifications: true } },
        },
      })
    : null;

  return (
    <div className="container-page max-w-2xl py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Email a customer</h1>
        <Link href="/admin" className="btn-ghost">← Admin</Link>
      </div>
      {!job ? (
        <p className="mt-4 text-gray-600">Job not found. Open this page from a link that includes the job.</p>
      ) : !job.customer?.email ? (
        <p className="mt-4 text-gray-600">{job.customer?.name} has no email address on their account.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-600">
            About: <Link href={`/jobs/${job.id}`} className="text-brand-700 hover:underline">{job.title}</Link>
          </p>
          <AdminMessageForm
            jobId={job.id}
            to={`${job.customer.name} <${job.customer.email}>`}
            defaultSubject={`Your ${job.category?.name?.toLowerCase() || ""} job on NaijaArtisans`.replace("  ", " ")}
            defaultBody={draft(job, job._count.notifications)}
          />
        </>
      )}
    </div>
  );
}
