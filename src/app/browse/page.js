"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CITIES } from "@/lib/constants";
import { priceRange } from "@/lib/format";

function BrowseInner() {
  const router = useRouter();
  const params = useSearchParams();

  const category = params.get("category") || "";
  const city = params.get("city") || "";
  const q = params.get("q") || "";

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (city) sp.set("city", city);
    if (q) sp.set("q", q);
    fetch(`/api/services?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .finally(() => setLoading(false));
  }, [category, city, q]);

  function setParam(key, value) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/browse?${sp.toString()}`);
  }

  function submitSearch(e) {
    e.preventDefault();
    setParam("q", search.trim());
  }

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">
        {activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : "Find an artisan"}
        {city ? <span className="text-gray-400"> in {city}</span> : null}
      </h1>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <input
            className="input"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary">Search</button>
        </form>
        <select className="input sm:w-48" value={category} onChange={(e) => setParam("category", e.target.value)}>
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

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-500">Loading artisans…</p>
        ) : services.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold">No artisans found</p>
            <p className="mt-1 text-gray-500">Try a different category or city — or post a job and let artisans come to you.</p>
            <Link href="/post-job" className="btn-primary mt-4">Post a job</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">{services.length} result{services.length === 1 ? "" : "s"}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <Link key={s.id} href={`/artisans/${s.artisan.id}`} className="card p-5 transition hover:shadow-md">
                  <span className="badge">{s.category.icon} {s.category.name}</span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                    <span className="text-gray-600">{s.artisan.name} · {s.city}</span>
                    <span className="font-semibold text-brand-700">{priceRange(s.priceMin, s.priceMax)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-center text-gray-500">Loading…</div>}>
      <BrowseInner />
    </Suspense>
  );
}
