"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES } from "@/lib/constants";

export default function SearchBar({ initialQ = "", initialCity = "", initialCategory = "", categories = [] }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row">
      <input
        className="input border-0 shadow-none focus:ring-0 sm:flex-1"
        placeholder="What service do you need? e.g. plumber, tailor, AC repair"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {categories.length > 0 && (
        <select
          className="input border-0 shadow-none focus:ring-0 sm:w-44 sm:border-l sm:border-gray-200"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Service category"
        >
          <option value="">All services</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      )}
      <select
        className="input border-0 shadow-none focus:ring-0 sm:w-44 sm:border-l sm:border-gray-200"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        aria-label="City"
      >
        <option value="">All cities</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button type="submit" className="btn-primary sm:w-auto">Search</button>
    </form>
  );
}
