import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminArtisanActions from "@/components/AdminArtisanActions";
import AdminVerifyInvite from "@/components/AdminVerifyInvite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artisans — Admin", robots: { index: false, follow: false } };

const FILTERS = { requests: "Requests", unverified: "Not verified", verified: "Verified", suspended: "Suspended", all: "All" };

function whereFor(filter) {
  if (filter === "verified") return { verifiedAt: { not: null }, suspendedAt: null };
  if (filter === "suspended") return { suspendedAt: { not: null } };
  if (filter === "unverified") return { verifiedAt: null, suspendedAt: null };
  if (filter === "requests") return { verifyRequestedAt: { not: null }, verifyDeclinedReason: null, verifiedAt: null, suspendedAt: null };
  return {};
}

export default async function AdminArtisansPage({ searchParams }) {
  if (!isAdmin()) return <AdminLogin />;
  const filter = FILTERS[searchParams.f] ? searchParams.f : "requests";
  const q = String(searchParams.q || "").trim();

  const [artisans, counts] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "ARTISAN",
        ...whereFor(filter),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true, name: true, phone: true, email: true, city: true, createdAt: true,
        verifiedAt: true, suspendedAt: true, suspendReason: true,
        verifyRequestedAt: true, verifyArea: true, verifyDeclinedReason: true, galleryUrls: true,
        services: { select: { category: { select: { name: true } } }, take: 2 },
      },
    }),
    Promise.all(Object.keys(FILTERS).map((f) => prisma.user.count({ where: { role: "ARTISAN", ...whereFor(f) } }))),
  ]);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Verify &amp; suspend artisans</h1>
        <Link href="/admin" className="btn-ghost">← Admin</Link>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">
        Artisans ask for verification from their own dashboard. Open <strong>Requests</strong>, check the photos are real
        work and the trade and area match the profile, then press <strong>✓ Verify</strong> or <strong>Decline</strong> (they are
        told either way). <strong>Suspend</strong> hides an artisan from every page and job alert and logs them out. Everything
        can be undone.
      </p>

      <AdminVerifyInvite />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Object.entries(FILTERS).map(([f, label], i) => (
          <Link key={f} href={`/admin/artisans?f=${f}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${f === filter ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-700"}`}>
            {label} ({counts[i]})
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="f" value={filter} />
          <input name="q" defaultValue={q} placeholder="Name, phone or email" className="input py-1.5 text-sm" />
          <button className="btn-outline py-1.5 text-sm">Search</button>
        </form>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-gray-500">
            <tr><th className="p-3">Artisan</th><th className="p-3">Trade</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {artisans.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No artisans here.</td></tr>
            )}
            {artisans.map((a) => {
              return (
                <tr key={a.id} className="border-b align-top last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/artisans/${a.id}`} className="font-semibold text-brand-700 hover:underline">{a.name}</Link>
                    <div className="text-xs text-gray-500">{a.city || "—"} · joined {a.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </td>
                  <td className="p-3">
                    <div>{a.services.map((s) => s.category.name).join(", ") || <span className="text-gray-400">No listing</span>}</div>
                    {a.verifyArea && <div className="text-xs text-gray-500">Works in: {a.verifyArea}</div>}
                    {a.galleryUrls.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {a.galleryUrls.slice(0, 4).map((u) => (
                          <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" className="h-12 w-12 rounded object-cover" /></a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div>{a.phone || <span className="text-gray-400">no phone</span>}</div>
                    <div className="text-xs text-gray-500">{a.email || ""}</div>
                  </td>
                  <td className="p-3">
                    {a.suspendedAt
                      ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Suspended{a.suspendReason ? `: ${a.suspendReason}` : ""}</span>
                      : a.verifiedAt
                        ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">✓ Verified {a.verifiedAt.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                        : a.verifyDeclinedReason
                          ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Declined: {a.verifyDeclinedReason}</span>
                          : a.verifyRequestedAt
                            ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Requested {a.verifyRequestedAt.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                            : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Not verified</span>}
                  </td>
                  <td className="p-3"><AdminArtisanActions id={a.id} verified={Boolean(a.verifiedAt)} suspended={Boolean(a.suspendedAt)} requested={Boolean(a.verifyRequestedAt && !a.verifyDeclinedReason)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
