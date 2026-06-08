import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrowseFilters from "@/components/BrowseFilters";
import JsonLd from "@/components/JsonLd";
import { priceRange } from "@/lib/format";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

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
  const { category = "", city = "", q = "" } = searchParams;
  const [categories, services] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({
      where: buildWhere({ category, city, q }),
      orderBy: { createdAt: "desc" },
      include: { category: true, artisan: { select: { id: true, name: true, city: true } } },
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const heading = activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : "Find an artisan";

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

      <h1 className="text-2xl font-bold">
        {heading}
        {city ? <span className="text-gray-400"> in {city}</span> : null}
      </h1>

      <div className="mt-5">
        <BrowseFilters categories={categories} category={category} city={city} q={q} />
      </div>

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
              {services.map((s) => (
                <Link key={s.id} href={`/artisans/${s.artisan.id}`} className="card p-5 transition hover:shadow-md">
                  <span className="badge">{s.category.icon} {s.category.name}</span>
                  <h2 className="mt-3 font-semibold">{s.title}</h2>
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
