"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES } from "@/lib/constants";

// Client-side filter controls for the (server-rendered) Browse page.
// Changing a filter navigates to a new URL, which re-renders the list on the server.
export default function BrowseFilters({ categories, category = "", city = "", q = "" }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  function navigate(next) {
    const params = new URLSearchParams();
    const merged = { category, city, q, ...next };
    if (merged.category) params.set("category", merged.category);
    if (merged.city) params.set("city", merged.city);
    if (merged.q) params.set("q", merged.q);
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form onSubmit={(e) => { e.preventDefault(); navigate({ q: search.trim() }); }} className="flex flex-1 gap-2">
        <input
          className="input"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search services"
        />
        <button className="btn-primary">Search</button>
      </form>
      <select className="input sm:w-48" value={category} onChange={(e) => navigate({ category: e.target.value })} aria-label="Filter by category">
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </select>
      <select className="input sm:w-44" value={city} onChange={(e) => navigate({ city: e.target.value })} aria-label="Filter by city">
        <option value="">All cities</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
