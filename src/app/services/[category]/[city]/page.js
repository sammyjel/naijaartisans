import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import JsonLd from "@/components/JsonLd";
import { priceRange } from "@/lib/format";
import { cityFromSlug, citySlug } from "@/lib/constants";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function load(categorySlug, citySlugParam) {
  const city = cityFromSlug(citySlugParam);
  if (!city) return { category: null, city: null, services: [] };
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return { category: null, city, services: [] };
  const services = await prisma.service.findMany({
    where: { categoryId: category.id, city },
    orderBy: { createdAt: "desc" },
    include: { artisan: { select: { id: true, name: true } } },
  });
  return { category, city, services };
}

export async function generateMetadata({ params }) {
  const city = cityFromSlug(params.city);
  if (!city) return { title: "Page not found" };
  const category = await prisma.category.findUnique({ where: { slug: params.category } });
  if (!category) return { title: "Service not found" };

  const name = category.name;
  const lower = name.toLowerCase();
  const count = await prisma.service.count({ where: { categoryId: category.id, city } });

  return {
    title: `${name} in ${city} — Hire Trusted ${name} Near You`,
    description: `Find and hire trusted ${lower} in ${city}, Nigeria. Compare verified artisans, prices and reviews — or post a ${lower} job in ${city} for free on NaijaArtisans.`,
    alternates: { canonical: `/services/${category.slug}/${citySlug(city)}` },
    openGraph: {
      title: `${name} in ${city} | NaijaArtisans`,
      description: `Hire trusted ${lower} in ${city}, Nigeria.`,
      type: "website",
    },
    // Don't let empty local pages dilute the site — only index ones with listings.
    robots: count > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function LocalLandingPage({ params }) {
  const { category, city, services } = await load(params.category, params.city);
  if (!city || !category) notFound();

  const name = category.name;
  const lower = name.toLowerCase();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${name} in ${city}`,
    itemListElement: services.slice(0, 25).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}/artisans/${s.artisan.id}`,
      name: `${s.title} — ${s.artisan.name}`,
    })),
  };

  const faqs = [
    {
      q: `How do I find a ${lower.replace(/&.*/, "").trim()} in ${city}?`,
      a: `Browse ${lower} in ${city} on NaijaArtisans, compare profiles, prices and reviews, then contact the artisan directly — or post a job for free and get quotes from ${lower} near you in ${city}.`,
    },
    {
      q: `Are the ${lower} on NaijaArtisans in ${city} reviewed?`,
      a: `Yes. Each artisan has a public profile with ratings and reviews from past customers, so you can hire ${lower} in ${city} with confidence.`,
    },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container-page py-8">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", url: "/" },
          { name: "Services", url: "/services" },
          { name, url: `/services/${category.slug}` },
          { name: `${name} in ${city}`, url: `/services/${category.slug}/${citySlug(city)}` },
        ])}
      />
      <JsonLd data={itemListLd} />
      <JsonLd data={faqLd} />

      <nav className="text-sm text-gray-500">
        <Link href="/services" className="hover:text-brand-700">Services</Link> <span className="text-gray-300">/</span>{" "}
        <Link href={`/services/${category.slug}`} className="hover:text-brand-700">{name}</Link>{" "}
        <span className="text-gray-300">/</span> <span className="text-gray-700">{city}</span>
      </nav>

      <h1 className="mt-2 text-3xl font-extrabold">
        <span className="mr-2">{category.icon}</span>{name} in {city}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Need a trusted {lower} in {city}? Browse skilled, reviewed {lower} on NaijaArtisans, compare
        prices, and hire the right professional for your job in {city}. Prefer quotes to come to you?{" "}
        <Link href="/post-job" className="font-semibold text-brand-700 hover:underline">Post a job for free</Link>.
      </p>

      <section className="mt-8">
        {services.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold">No {lower} listed in {city} yet</p>
            <p className="mt-1 text-gray-500">
              Post a job in {city} and skilled artisans will send you quotes — or{" "}
              <Link href={`/services/${category.slug}`} className="text-brand-700 hover:underline">
                see {lower} elsewhere in Nigeria
              </Link>.
            </p>
            <Link href="/post-job" className="btn-primary mt-4">Post a job in {city}</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              {services.length} {lower} {services.length === 1 ? "professional" : "professionals"} in {city}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <Link key={s.id} href={`/artisans/${s.artisan.id}`} className="card p-5 transition hover:shadow-md">
                  <span className="badge">{category.icon} {name}</span>
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
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">{name} in {city}: frequently asked questions</h2>
        <div className="mt-4 max-w-3xl divide-y divide-gray-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                {f.q}
                <span className="ml-4 text-brand-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
