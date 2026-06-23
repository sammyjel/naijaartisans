import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminLogout from "@/components/AdminLogout";
import { isFeatured } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

function Stat({ label, value, accent }) {
  return (
    <div className="card p-5">
      <div className={`text-3xl font-extrabold ${accent || "text-brand-700"}`}>{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default async function AdminPage() {
  if (!isAdmin()) return <AdminLogin />;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, artisans, customers, newThisWeek, users, topReferrers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ARTISAN" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, name: true, role: true, city: true, phone: true, email: true,
        createdAt: true, featuredUntil: true,
        _count: { select: { referrals: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { referrals: { _count: "desc" } },
      take: 5,
      select: { id: true, name: true, city: true, _count: { select: { referrals: true } } },
    }),
  ]);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const referrers = topReferrers.filter((r) => r._count.referrals > 0);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <AdminLogout />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total members" value={total} />
        <Stat label="Artisans" value={artisans} accent="text-amber-600" />
        <Stat label="Customers" value={customers} accent="text-blue-600" />
        <Stat label="Joined this week" value={newThisWeek} accent="text-brand-600" />
      </div>

      {/* Top referrers */}
      {referrers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Top referrers</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {referrers.map((r) => (
              <span key={r.id} className="badge">
                {r.name} — {r._count.referrals} invited
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Members table */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Members ({users.length}{total > users.length ? ` of ${total}` : ""})</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">City</th>
                <th className="px-3 py-2 font-semibold">Phone</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Invited</th>
                <th className="px-3 py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {u.name}
                    {isFeatured(u.featuredUntil) && <span className="ml-1 text-amber-500" title="Featured">⭐</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={u.role === "ARTISAN" ? "text-amber-700" : "text-blue-700"}>
                      {u.role === "ARTISAN" ? "Artisan" : "Customer"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{u.city || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {u.phone ? <a href={`tel:${u.phone}`} className="text-brand-700 hover:underline">{u.phone}</a> : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{u.email || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{u._count.referrals || "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
