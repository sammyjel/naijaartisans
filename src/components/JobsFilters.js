"use client";

import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/constants";

export default function JobsFilters({ categories, category = "", city = "" }) {
  const router = useRouter();

  function navigate(next) {
    const params = new URLSearchParams();
    const merged = { category, city, ...next };
    if (merged.category) params.set("category", merged.category);
    if (merged.city) params.set("city", merged.city);
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <select className="input sm:w-56" value={category} onChange={(e) => navigate({ category: e.target.value })} aria-label="Filter by category">
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
