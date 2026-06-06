"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CITIES } from "@/lib/constants";
import { naira, timeAgo } from "@/lib/format";

function JobsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get("category") || "";
  const city = params.get("city") || "";

  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (city) sp.set("city", city);
    fetch(`/api/jobs?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .finally(() => setLoading(false));
  }, [category, city]);

  function setParam(key, value) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/jobs?${sp.toString()}`);
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Job board</h1>
          <p className="text-gray-500">Open jobs from customers. Send a quote to win the work.</p>
        </div>
        <Link href="/post-job" className="btn-primary">Post a job</Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select className="input sm:w-56" value={category} onChange={(e) => setParam("category", e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={city} onChange={(e) => setParam("city", e.target.value)}>
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-gray-500">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">No open jobs match your filters yet.</div>
        ) : (
          jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="card block p-5 transition hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="badge">{j.category.icon} {j.category.name}</span>
                <span className={`text-xs font-semibold ${j.status === "OPEN" ? "text-brand-600" : "text-gray-400"}`}>
                  {j.status}
                </span>
              </div>
              <h3 className="mt-2 font-semibold">{j.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{j.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>📍 {j.city}</span>
                {j.budget ? <span>💰 Budget {naira(j.budget)}</span> : null}
                <span>💬 {j._count.quotes} quote{j._count.quotes === 1 ? "" : "s"}</span>
                <span className="text-gray-400">· {timeAgo(j.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-center text-gray-500">Loading…</div>}>
      <JobsInner />
    </Suspense>
  );
}
