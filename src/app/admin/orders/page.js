import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import { ORDER_STATUS_LABEL, nairaK } from "@/lib/dfy-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Admin", robots: { index: false, follow: false } };

const TONE = {
  AWAITING_DEPOSIT: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  AWAITING_BALANCE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-400",
  REFUNDED: "bg-gray-100 text-gray-400",
};

export default async function AdminOrdersPage() {
  if (!isAdmin()) return <AdminLogin />;
  const orders = await prisma.serviceOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { package: { select: { title: true } }, payments: { where: { status: "PAID" }, select: { amountKobo: true } } },
  });

  const paid = orders.flatMap((o) => o.payments).reduce((s, p) => s + p.amountKobo, 0);
  const owedToDeliverers = orders
    .filter((o) => o.fulfillerName && !o.fulfillerPaidAt && ["IN_PROGRESS", "AWAITING_BALANCE", "COMPLETED"].includes(o.status))
    .reduce((s, o) => s + (o.fulfillerCostKobo ?? o.costKobo), 0);
  const now = Date.now();

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Done-for-you orders</h1>
        <div className="flex gap-2">
          <Link href="/done-for-you" className="btn-outline">View catalogue</Link>
          <Link href="/admin" className="btn-ghost">← Admin</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-3xl font-extrabold text-brand-700">{nairaK(paid)}</div><div className="text-sm text-gray-500">Collected (all orders)</div></div>
        <div className="card p-5"><div className="text-3xl font-extrabold text-amber-600">{orders.filter((o) => o.status === "IN_PROGRESS").length}</div><div className="text-sm text-gray-500">In progress — to deliver</div></div>
        <div className="card p-5"><div className="text-3xl font-extrabold text-gray-700">{nairaK(owedToDeliverers)}</div><div className="text-sm text-gray-500">Still owed to deliverers</div></div>
      </div>

      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No orders yet. Share <Link href="/done-for-you" className="font-semibold text-brand-700">/done-for-you</Link> to get the first one.</div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr><th className="p-3">Order</th><th className="p-3">Package</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Due</th><th className="p-3">Deliverer</th><th className="p-3 text-right">Price</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const late = o.status === "IN_PROGRESS" && o.dueAt && o.dueAt.getTime() < now;
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3 font-semibold"><Link href={`/admin/orders/${o.reference}`} className="text-brand-700 hover:underline">{o.reference}</Link></td>
                    <td className="p-3">{o.package.title}</td>
                    <td className="p-3">{o.customerName}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[o.status] || ""}`}>{ORDER_STATUS_LABEL[o.status] || o.status}</span></td>
                    <td className={`p-3 ${late ? "font-bold text-red-600" : ""}`}>{o.dueAt ? o.dueAt.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—"}{late ? " LATE" : ""}</td>
                    <td className="p-3">{o.fulfillerName || (o.status === "IN_PROGRESS" ? <span className="font-semibold text-red-600">Not assigned</span> : "—")}</td>
                    <td className="p-3 text-right">{nairaK(o.priceKobo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
