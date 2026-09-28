// Admin follow-up table: every job, who posted it, how to reach them, and where
// the transaction got to.
//
// The point is the phone number. Knowing a job was marked complete is not the
// same as knowing the customer was happy with it, and the only way to learn the
// difference on a marketplace this size is to ring them. So each row carries a
// WhatsApp link with the conversation already opened, phrased for the state the
// job is actually in — chasing a stalled job and checking on a finished one are
// different calls.
//
// This is a server component: it renders inside the already-authenticated
// /admin page, so the contact details never travel to an unauthenticated client.

import Link from "next/link";
import { whatsAppLink } from "@/lib/phone";

const STATUS_STYLE = {
  OPEN: "bg-blue-50 text-blue-700 ring-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-200",
  COMPLETED: "bg-green-50 text-green-700 ring-green-200",
  CLOSED: "bg-gray-100 text-gray-500 ring-gray-200",
};

const DEAL_LABEL = {
  IN_PROGRESS: "In process",
  AWAITING_CONFIRMATION: "Artisan says done — customer has not confirmed",
  COMPLETED: "Confirmed complete",
  CANCELLED: "Cancelled",
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
const ageDays = (d) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);

/** What to open the WhatsApp conversation with, given where the job stands. */
function followUpMessage(job, deal) {
  const name = (job.customer?.name || "there").split(" ")[0];
  if (deal?.status === "COMPLETED") {
    return `Hi ${name}, this is NaijaArtisans. You marked "${job.title}" as completed — were you happy with the work? Anything we should know?`;
  }
  if (deal?.status === "AWAITING_CONFIRMATION") {
    return `Hi ${name}, this is NaijaArtisans. The artisan says "${job.title}" is finished. Is that right? Confirming it on the site helps other customers know who to trust.`;
  }
  if (deal) {
    return `Hi ${name}, this is NaijaArtisans. Just checking in on "${job.title}" — how is it going with the artisan?`;
  }
  if (job._count.quotes > 0) {
    return `Hi ${name}, this is NaijaArtisans. You have ${job._count.quotes} quote(s) on "${job.title}". Would you like help picking one?`;
  }
  return `Hi ${name}, this is NaijaArtisans. You posted "${job.title}" and have not had a quote yet. We are pushing it to more artisans — is it still needed?`;
}

export default function AdminJobFollowUp({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-bold">Jobs &amp; follow-up</h2>
        <p className="mt-2 text-sm text-gray-500">No jobs posted yet.</p>
      </section>
    );
  }

  const needsAttention = jobs.filter(
    (j) => j.deal?.status === "AWAITING_CONFIRMATION" || (j.status === "OPEN" && j._count.quotes === 0)
  ).length;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Jobs &amp; follow-up ({jobs.length})</h2>
      <p className="text-sm text-gray-500">
        Every job with the poster&rsquo;s number, so you can call or message them directly. Marked
        complete is not the same as satisfied — the only way to know is to ask.
      </p>
      {needsAttention > 0 && (
        <p className="mt-2 inline-block rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
          {needsAttention} {needsAttention === 1 ? "job needs" : "jobs need"} a follow-up
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Job</th>
              <th className="px-3 py-2 font-semibold">Posted by</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Transaction</th>
              <th className="px-3 py-2 font-semibold">Quotes</th>
              <th className="px-3 py-2 font-semibold">Posted</th>
              <th className="px-3 py-2 font-semibold">Follow up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((j) => {
              const deal = j.deal;
              const wa = whatsAppLink(j.customer?.phone, followUpMessage(j, deal));
              return (
                <tr key={j.id} className="align-top">
                  <td className="px-3 py-2">
                    <Link href={`/jobs/${j.id}`} className="font-medium text-brand-700 hover:underline">
                      {j.title}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {j.category?.name} · {j.city}
                    </div>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                        STATUS_STYLE[j.status] || STATUS_STYLE.CLOSED
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {j.customer?.name || "—"}
                    {j.customer?.email && (
                      <div className="text-xs text-gray-400">{j.customer.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {j.customer?.phone ? (
                      <a href={`tel:${j.customer.phone}`} className="text-brand-700 hover:underline">
                        {j.customer.phone}
                      </a>
                    ) : (
                      <span className="text-amber-600">no number</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {deal ? (
                      <>
                        <div className="font-medium">{DEAL_LABEL[deal.status] || deal.status}</div>
                        <div className="text-xs text-gray-400">
                          with {deal.artisan?.name}
                          {deal.artisan?.phone ? ` · ${deal.artisan.phone}` : ""}
                        </div>
                        {deal.completedAt && (
                          <div className="text-xs text-gray-400">
                            confirmed {fmtDate(deal.completedAt)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">not started</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 ${j._count.quotes === 0 ? "font-semibold text-red-600" : ""}`}>
                    {j._count.quotes}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{ageDays(j.createdAt)}d</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-green-700 hover:underline"
                      >
                        💬 WhatsApp
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
