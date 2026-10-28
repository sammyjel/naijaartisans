import Link from "next/link";
import DfyOrderActions from "@/components/DfyOrderActions";
import { orderForCustomer } from "@/lib/dfy";
import { ORDER_STATUS_LABEL, nairaK, canRequestRevision } from "@/lib/dfy-catalog";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEPS = ["AWAITING_DEPOSIT", "IN_PROGRESS", "AWAITING_BALANCE", "COMPLETED"];
const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

export default async function OrderPage({ params, searchParams }) {
  const order = await orderForCustomer(params.reference, searchParams?.t);
  if (!order) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-gray-600">
          Use the link in your order email. Lost it? Email{" "}
          <a href={`mailto:${SITE.email}`} className="font-semibold text-brand-700">{SITE.email}</a> with your order code.
        </p>
      </div>
    );
  }

  const pkg = order.package;
  const step = STEPS.indexOf(order.status);
  // Payment confirmation comes from Paystack's webhook a few seconds after the
  // customer is sent back here; say so rather than show a stale "unpaid".
  const justPaid = searchParams?.paid === "1" && (order.status === "AWAITING_DEPOSIT" || order.status === "AWAITING_BALANCE");

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/done-for-you" className="text-sm font-medium text-brand-700 hover:underline">← Done-for-you</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">{pkg.title}</h1>
        <span className="badge">Order {order.reference}</span>
      </div>
      <p className="mt-1 text-gray-600">Hi {order.customerName.split(" ")[0]}, here is where your order stands.</p>

      {justPaid && (
        <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          ✅ Payment received — confirming with Paystack. Refresh this page in a minute.
        </div>
      )}

      {step >= 0 ? (
        <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
          {["Deposit", "In progress", "Review", "Done"].map((label, i) => (
            <li key={label} className={`rounded-lg px-2 py-2 font-semibold ${i <= step ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"}`}>
              {label}
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-6 rounded-lg bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">{ORDER_STATUS_LABEL[order.status]}</div>
      )}

      <div className="card mt-6 p-6">
        <div className="text-sm text-gray-500">Status</div>
        <div className="text-lg font-bold">{ORDER_STATUS_LABEL[order.status] || order.status}</div>
        {order.status === "IN_PROGRESS" && order.dueAt && (
          <p className="mt-1 text-sm text-gray-600">
            Due by <strong>{fmt(order.dueAt)}</strong>.
            {order.revisionNote ? " We're working on the changes you asked for." : " We'll email you when it's ready to review."}
          </p>
        )}
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>Total: <strong>{nairaK(order.priceKobo)}</strong></div>
          <div>Deposit: <strong>{nairaK(order.depositKobo)}</strong>{step >= 1 ? " ✓" : ""}</div>
          <div>Balance: <strong>{nairaK(order.balanceKobo)}</strong>{order.status === "COMPLETED" ? " ✓" : ""}</div>
        </div>

        <DfyOrderActions
          reference={order.reference}
          token={searchParams.t}
          status={order.status}
          depositLabel={nairaK(order.depositKobo)}
          balanceLabel={nairaK(order.balanceKobo)}
          canRevise={canRequestRevision(order, pkg)}
          revisionsLeft={Math.max(0, pkg.revisions - order.revisionsUsed)}
        />
      </div>

      {order.deliveries.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-bold">Your work</h2>
          <div className="mt-4 space-y-4">
            {order.deliveries.map((d) => (
              <div key={d.id} className="rounded-lg border border-gray-100 p-4">
                <div className="text-xs text-gray-400">
                  {fmt(d.createdAt)} · {d.accepted ? "Final files" : "For your review"}
                </div>
                {d.note && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{d.note}</p>}
                {d.fileUrls.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {d.fileUrls.map((u, i) => (
                      <li key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">
                          📎 File {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Questions? Email <a href={`mailto:${SITE.email}`} className="font-semibold text-brand-700">{SITE.email}</a> and quote {order.reference}.
      </p>
    </div>
  );
}
