import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrowseFilters from "@/components/BrowseFilters";
import JsonLd from "@/components/JsonLd";
import AdSlot from "@/components/AdSlot";
import NearMeButton from "@/components/NearMeButton";
import { priceRange, featuredFirst, isFeatured } from "@/lib/format";
import { distanceKm, formatDistance } from "@/lib/geo";
import { SITE, breadcrumbLd } from "@/lib/seo";
import { allGuides } from "@/lib/guides";
import { CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Big hubs shown as quick city links (filtered to cities we actually cover).
const TOP_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Benin City",
  "Enugu", "Kaduna", "Owerri", "Uyo", "Calabar", "Warri",
].filter((c) => CITIES.includes(c));

function buildWhere({ category, city, q }) {
  const where = {};
  if (category) where.category = { slug: category };
  if (city) where.city = city;
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  return where;
}

export async function generateMetadata({ searchParams }) {
  const { category, city } = searchParams;
  const cat = category ? await prisma.category.findUnique({ where: { slug: category } }) : null;
  const what = cat ? cat.name : "Trusted artisans & service pros";
  const where = city ? ` in ${city}` : " in Nigeria";
  const title = `${what}${where}`;
  const description = `Find and hire ${cat ? cat.name.toLowerCase() : "skilled artisans"}${city ? ` in ${city}` : " across Nigeria"}. Compare profiles, prices and reviews — or post a job for free on NaijaArtisans.`;

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (city) qs.set("city", city);
  const canonical = qs.toString() ? `/browse?${qs.toString()}` : "/browse";

  return { title, description, alternates: { canonical } };
}

export default async function BrowsePage({ searchParams }) {
  const { category = "", city = "", q = "", lat = "", lng = "" } = searchParams;
  const hasGeo = Boolean(lat && lng);
  const [categories, services] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({
      where: buildWhere({ category, city, q }),
      orderBy: { createdAt: "desc" },
      include: { category: true, artisan: { select: { id: true, name: true, city: true, featuredUntil: true, latitude: true, longitude: true } } },
    }),
  ]);

  // When "near me" is active, sort by distance; otherwise featured-first.
  const ordered = hasGeo
    ? services
        .map((s) => ({ ...s, _dist: distanceKm(lat, lng, s.artisan.latitude, s.artisan.longitude) }))
        .sort((a, b) => {
          if (a._dist == null && b._dist == null) return 0;
          if (a._dist == null) return 1;
          if (b._dist == null) return -1;
          return a._dist - b._dist;
        })
    : featuredFirst(services);
  const activeCategory = categories.find((c) => c.slug === category);
  const heading = activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : "Find an artisan";
  const guides = allGuides();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.slice(0, 20).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}/artisans/${s.artisan.id}`,
      name: `${s.title} — ${s.artisan.name}`,
    })),
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Browse artisans", url: "/browse" }])} />
      <JsonLd data={itemListLd} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {heading}
          {city ? <span className="text-gray-400"> in {city}</span> : null}
        </h1>
        <NearMeButton baseParams={{ category, city, q }} active={hasGeo} />
      </div>
      {hasGeo && <p className="mt-2 text-sm text-brand-700">📍 Showing artisans nearest to your location first.</p>}

      {!category && !city && !q && (
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Find and hire trusted local artisans across all 36 states and the FCT — plumbers, electricians,
          tailors, carpenters, AC technicians, caterers, cleaners and more. Compare profiles and prices,
          contact them directly on WhatsApp, or post a job for free and let artisans come to you.
        </p>
      )}

      <div className="mt-5">
        <BrowseFilters categories={categories} category={category} city={city} q={q} />
      </div>

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT} className="mt-6" />

      <div className="mt-6">
        {services.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold">No artisans found</p>
            <p className="mt-1 text-gray-500">Try a different category or city — or post a job and let artisans come to you.</p>
            <Link href="/post-job" className="btn-primary mt-4">Post a job</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">{services.length} result{services.length === 1 ? "" : "s"}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ordered.map((s) => (
                <Link key={s.id} href={`/artisans/${s.artisan.id}`} className={`card p-5 transition hover:shadow-md ${isFeatured(s.artisan.featuredUntil) ? "ring-1 ring-amber-300" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="badge">{s.category.icon} {s.category.name}</span>
                    {isFeatured(s.artisan.featuredUntil) && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">⭐ Featured</span>
                    )}
                  </div>
                  <h2 className="mt-3 font-semibold">{s.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                    <span className="text-gray-600">
                      {s.artisan.name} · {s.city}
                      {s._dist != null && <span className="ml-1 font-medium text-brand-700">· 📍 {formatDistance(s._dist)}</span>}
                    </span>
                    <span className="font-semibold text-brand-700">{priceRange(s.priceMin, s.priceMax)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Always-present hub content so /browse is a rich, indexable page even
          before many artisans have joined. Also builds internal links. */}
      <section className="mt-12 border-t border-gray-100 pt-10">
        <h2 className="text-xl font-bold">Popular services</h2>
        <p className="mt-1 text-sm text-gray-500">Tap a service to see artisans, or post a job and get free quotes.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/browse?category=${c.slug}`} className="badge hover:bg-brand-100">
              {c.icon} {c.name}
            </Link>
          ))}
        </div>

        {TOP_CITIES.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-bold">Browse by city</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {TOP_CITIES.map((c) => (
                <Link
                  key={c}
                  href={`/browse?city=${encodeURIComponent(c)}`}
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:border-brand-300 hover:text-brand-700"
                >
                  {c}
                </Link>
              ))}
            </div>
          </>
        )}

        {guides.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-bold">Hiring guides &amp; fair 2026 prices</h2>
            <p className="mt-1 text-sm text-gray-500">Know what a job should cost before you hire.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guides.slice(0, 6).map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="card p-4 transition hover:shadow-md">
                  <p className="font-semibold text-brand-700">{g.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{g.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="card mt-10 bg-brand-50 p-6 text-center">
          <h2 className="text-lg font-bold text-brand-800">Can&apos;t find who you need?</h2>
          <p className="mt-1 text-sm text-brand-700">Post your job for free and skilled artisans will send you quotes.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/post-job" className="btn-primary">Post a job free</Link>
            <Link href="/founding-artisan" className="btn-outline">List your services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
