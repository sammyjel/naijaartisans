"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ShareButtons from "@/components/ShareButtons";
import { naira, priceRange, timeAgo, isFeatured } from "@/lib/format";
import { SITE } from "@/lib/seo";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [services, setServices] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const tasks = [
      fetch("/api/jobs?mine=1").then((r) => r.json()).then((d) => setJobs(d.jobs || [])),
    ];
    if (user.role === "ARTISAN") {
      tasks.push(
        fetch(`/api/artisans/${user.id}`).then((r) => r.json()).then((d) => setServices(d.artisan?.services || []))
      );
    }
    Promise.all(tasks).finally(() => setDataLoading(false));
  }, [user]);

  async function deleteService(id) {
    if (!confirm("Delete this service listing?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setServices((s) => s.filter((x) => x.id !== id));
  }

  if (loading || !user) return <div className="container-page py-12 text-center text-gray-500">Loading…</div>;

  const isArtisan = user.role === "ARTISAN";

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-gray-500">
            {isArtisan ? "Manage your services and find jobs." : "Track your posted jobs and quotes."}
          </p>
        </div>
        <div className="flex gap-2">
          {isArtisan ? (
            <>
              <Link href="/services/new" className="btn-primary">+ List a service</Link>
              <Link href="/jobs" className="btn-outline">Find jobs</Link>
            </>
          ) : (
            <Link href="/post-job" className="btn-primary">+ Post a job</Link>
          )}
        </div>
      </div>

      {/* Artisan: invite & grow */}
      {isArtisan && (
        <section className="mt-8">
          <div className="card bg-brand-50 p-6">
            <h2 className="text-lg font-bold text-brand-800">Invite artisans, grow together 🤝</h2>
            <p className="mt-1 text-sm text-brand-700">
              Know other plumbers, electricians, tailors or mechanics? Share your invite link — every
              artisan who joins earns you <strong>7 days of free Featured placement</strong>.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-lg bg-white px-4 py-2 text-sm">
                <span className="font-bold text-brand-700">{user._count?.referrals ?? 0}</span>{" "}
                <span className="text-gray-500">artisan{(user._count?.referrals ?? 0) === 1 ? "" : "s"} invited</span>
              </div>
              {isFeatured(user.featuredUntil) && (
                <div className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                  ⭐ Featured until {new Date(user.featuredUntil).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-gray-600 break-all">
              {SITE.url}/join?ref={user.id}
            </div>
            <div className="mt-4">
              <ShareButtons
                url={`${SITE.url}/join?ref=${user.id}`}
                title="Join me on NaijaArtisans and get more jobs — list your business free"
                label="Share your invite 👇"
              />
            </div>
          </div>
        </section>
      )}

      {/* Artisan: my services */}
      {isArtisan && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">My services</h2>
          {dataLoading ? (
            <p className="mt-2 text-gray-500">Loading…</p>
          ) : services.length === 0 ? (
            <div className="card mt-3 p-8 text-center text-gray-500">
              You haven't listed any service yet.{" "}
              <Link href="/services/new" className="font-semibold text-brand-700 hover:underline">Add your first one →</Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {services.map((s) => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="badge">{s.category.icon} {s.category.name}</span>
                    <span className="font-semibold text-brand-700">{priceRange(s.priceMin, s.priceMax)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{s.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{s.city}</span>
                    <button onClick={() => deleteService(s.id)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* My posted jobs */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">My posted jobs</h2>
        {dataLoading ? (
          <p className="mt-2 text-gray-500">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="card mt-3 p-8 text-center text-gray-500">
            You haven't posted any job yet.{" "}
            <Link href="/post-job" className="font-semibold text-brand-700 hover:underline">Post one →</Link>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {jobs.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="card block p-5 transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="badge">{j.category.icon} {j.category.name}</span>
                  <span className={`text-xs font-semibold ${j.status === "OPEN" ? "text-brand-600" : "text-gray-400"}`}>{j.status}</span>
                </div>
                <h3 className="mt-2 font-semibold">{j.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
                  <span>📍 {j.city}</span>
                  {j.budget ? <span>💰 {naira(j.budget)}</span> : null}
                  <span>💬 {j._count.quotes} quote{j._count.quotes === 1 ? "" : "s"}</span>
                  <span className="text-gray-400">· {timeAgo(j.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {isArtisan && (
        <p className="mt-8 text-sm text-gray-500">
          View your public profile:{" "}
          <Link href={`/artisans/${user.id}`} className="font-semibold text-brand-700 hover:underline">/artisans/{user.id}</Link>
        </p>
      )}
    </div>
  );
}
