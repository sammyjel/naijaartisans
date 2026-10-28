import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminOrderActions from "@/components/AdminOrderActions";
import { PACKAGES, ORDER_STATUS_LABEL, nairaK } from "@/lib/dfy-catalog";
import { trackingPath } from "@/lib/dfy";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order — Admin", robots: { index: false, follow: false } };

const fmt = (d) => (d ? new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default async function AdminOrderPage({ params }) {
  if (!isAdmin()) return <AdminLogin />;
  const order = await prisma.serviceOrder.findUnique({
    where: { reference: params.reference },
    include: { package: true, payments: { orderBy: { createdAt: "asc" } }, deliveries: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const brief = (() => { try { return JSON.parse(order.briefJson); } catch { return {}; } })();
  const questions = PACKAGES.find((p) => p.slug === order.package.slug)?.questions || [];
  const cost = order.fulfillerCostKobo ?? order.costKobo;
  const wa = order.customerPhone ? order.customerPhone.replace(/\D/g, "").replace(/^0/, "234") : null;

  // A ready-to-forward brief for the freelancer: everything they need, none of
  // the customer's contact details (so the job cannot be taken off-platform).
  const forward = [
    `New job: ${order.package.title} (${order.reference})`,
    `Deadline: ${order.dueAt ? new Date(order.dueAt).toDateString() : "ASAP"}`,
    "",
    "Deliverables:",
    ...order.package.deliverables.map((d) => `- ${d}`),
    "",
    "Customer brief:",
    ...questions.filter((q) => brief[q.id]).map((q) => `${q.label}:\n${brief[q.id]}`),
    order.revisionNote ? `\nCHANGES REQUESTED:\n${order.revisionNote}` : "",
  ].join("\n");

  return (
    <div className="container-page max-w-4xl py-8">
      <Link href="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{order.reference} · {order.package.title}</h1>
        <span className="badge">{ORDER_STATUS_LABEL[order.status] || order.status}</span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="font-bold">Customer</h2>
          <div className="mt-2">{order.customerName}</div>
          <div><a className="text-brand-700" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></div>
          {wa && <div><a className="text-brand-700" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp {order.customerPhone}</a></div>}
          <div className="mt-3 text-xs text-gray-500 break-all">Customer link: {SITE.url}{trackingPath(order)}</div>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-bold">Money</h2>
          <div className="mt-2">Price {nairaK(order.priceKobo)} · deposit {nairaK(order.depositKobo)} · balance {nairaK(order.balanceKobo)}</div>
          <div>Deliverer budget {nairaK(cost)} → margin <strong>{nairaK(order.priceKobo - cost)}</strong></div>
          <div className="mt-2 space-y-0.5">
            {order.payments.length === 0 ? <div className="text-gray-500">No payments yet.</div> : order.payments.map((p) => (
              <div key={p.id}>{p.kind} {nairaK(p.amountKobo)} · {p.status} · {fmt(p.paidAt)}</div>
            ))}
          </div>
          <div className="mt-2">Due {fmt(order.dueAt)} · delivered {fmt(order.deliveredAt)} · completed {fmt(order.completedAt)}</div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="font-bold">Brief</h2>
        {order.revisionNote && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Changes requested ({order.revisionsUsed}/{order.package.revisions}):</strong> {order.revisionNote}</div>
        )}
        <dl className="mt-3 space-y-3 text-sm">
          {questions.map((q) => (
            <div key={q.id}><dt className="text-gray-500">{q.label}</dt><dd className="whitespace-pre-line">{brief[q.id] || "—"}</dd></div>
          ))}
        </dl>
      </div>

      <AdminOrderActions
        reference={order.reference}
        status={order.status}
        fulfiller={{ name: order.fulfillerName || "", note: order.fulfillerNote || "", costNaira: cost / 100, paidAt: order.fulfillerPaidAt }}
        forwardText={forward}
      />

      {order.deliveries.length > 0 && (
        <div className="card mt-6 p-5 text-sm">
          <h2 className="font-bold">Deliveries</h2>
          {order.deliveries.map((d) => (
            <div key={d.id} className="mt-3 border-t pt-3">
              <div className="text-xs text-gray-500">{fmt(d.createdAt)} · {d.accepted ? "Final" : "Preview for review"}</div>
              {d.note && <p className="whitespace-pre-line">{d.note}</p>}
              {d.fileUrls.map((u) => <div key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-brand-700 break-all">{u}</a></div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
