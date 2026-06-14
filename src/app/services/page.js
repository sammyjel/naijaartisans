import Link from "next/link";
import { prisma } from "@/lib/prisma";
import JsonLd from "@/components/JsonLd";
import { CITIES, citySlug } from "@/lib/constants";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Browse artisan services across Nigeria",
    description:
      "Explore every service on NaijaArtisans — plumbing, electrical, tailoring, catering, auto mechanic and more — in Lagos, Abuja, Port Harcourt and cities across Nigeria. Find trusted artisans or post a job for free.",
    alternates: { canonical: "/services" },
  };
}

export default async function ServicesHubPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { services: true } } },
  });

  // A handful of high-intent "[trade] in [city]" links to seed crawling.
  const topCities = CITIES.slice(0, 6);
  const popular = categories
    .slice(0, 6)
    .flatMap((c) => topCities.slice(0, 3).map((city) => ({ cat: c, city })));

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Artisan services on NaijaArtisans",
    itemListElement: categories.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}/services/${c.slug}`,
      name: c.name,
    })),
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Services", url: "/services" }])} />
      <JsonLd data={itemListLd} />

      <h1 className="text-3xl font-extrabold">Artisan services across Nigeria</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Hire skilled, reviewed artisans for any job — at home, in the office or on site. Browse a
        service below to see professionals and prices in your city, or{" "}
        <Link href="/post-job" className="font-semibold text-brand-700 hover:underline">post a job for free</Link>{" "}
        and let artisans come to you.
      </p>

      {/* All services */}
      <section className="mt-8">
        <h2 className="text-xl font-bold">All services</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/services/${c.slug}`}
              className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-2xl">{c.icon || "🛠️"}</span>
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="text-xs text-gray-400">
                  {c._count.services} {c._count.services === 1 ? "pro" : "pros"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular local searches */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Popular local searches</h2>
        <p className="mt-1 text-sm text-gray-500">Trusted artisans in Nigeria&apos;s biggest cities.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {popular.map(({ cat, city }) => (
            <Link
              key={`${cat.slug}-${city}`}
              href={`/services/${cat.slug}/${citySlug(city)}`}
              className="badge transition hover:bg-brand-100 hover:text-brand-800"
            >
              {cat.name} in {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by city */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Cities we cover</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <Link
              key={city}
              href={`/browse?city=${encodeURIComponent(city)}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
