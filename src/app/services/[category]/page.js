import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import JsonLd from "@/components/JsonLd";
import { priceRange, featuredFirst, isFeatured } from "@/lib/format";
import { citySlug } from "@/lib/constants";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function getCategory(slug) {
  return prisma.category.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }) {
  const category = await getCategory(params.category);
  if (!category) return { title: "Service not found" };

  const name = category.name;
  const lower = name.toLowerCase();
  return {
    title: `${name} in Nigeria — Hire Trusted ${name} Pros`,
    description: `Find and hire trusted ${lower} in Nigeria. Compare verified artisans, prices and reviews across Lagos, Abuja, Port Harcourt and more — or post a ${lower} job for free on NaijaArtisans.`,
    alternates: { canonical: `/services/${category.slug}` },
    openGraph: {
      title: `${name} in Nigeria | NaijaArtisans`,
      description: `Hire trusted ${lower} near you across Nigeria.`,
      type: "website",
    },
  };
}

export default async function CategoryLandingPage({ params }) {
  const category = await getCategory(params.category);
  if (!category) notFound();

  const services = await prisma.service.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
    include: { artisan: { select: { id: true, name: true, featuredUntil: true } } },
  });

  const ordered = featuredFirst(services);
  // Cities that actually have a listing in this category → local landing links.
  const cities = [...new Set(services.map((s) => s.city))].sort();
  const name = category.name;
  const lower = name.toLowerCase();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${name} services in Nigeria`,
    itemListElement: services.slice(0, 25).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}/artisans/${s.artisan.id}`,
      name: `${s.title} — ${s.artisan.name}`,
    })),
  };

  const faqs = [
    {
      q: `How do I hire a ${lower.replace(/&.*/, "").trim()} in Nigeria?`,
      a: `Browse ${lower} on NaijaArtisans, compare profiles, prices and reviews, then contact the artisan directly — or post a job for free and receive quotes from professionals near you.`,
    },
    {
      q: `How much does ${lower} cost in Nigeria?`,
      a: `Prices vary by job size and city. Each artisan lists their own price range on NaijaArtisans, so you can compare quotes before you hire.`,
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
        ])}
      />
      <JsonLd data={itemListLd} />
      <JsonLd data={faqLd} />

      <nav className="text-sm text-gray-500">
        <Link href="/services" className="hover:text-brand-700">Services</Link> <span className="text-gray-300">/</span>{" "}
        <span className="text-gray-700">{name}</span>
      </nav>

      <h1 className="mt-2 text-3xl font-extrabold">
        <span className="mr-2">{category.icon}</span>{name} in Nigeria
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Looking for a reliable {lower} professional? Browse trusted {lower} on NaijaArtisans, compare
        prices and reviews, and hire with confidence anywhere in Nigeria. Need a custom quote?{" "}
        <Link href="/post-job" className="font-semibold text-brand-700 hover:underline">Post a job for free</Link>.
      </p>

      {/* Available cities */}
      {cities.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {name} by city
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link
                key={city}
                href={`/services/${category.slug}/${citySlug(city)}`}
                className="badge transition hover:bg-brand-100 hover:text-brand-800"
              >
                {name} in {city}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Listings */}
      <section className="mt-8">
        {services.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold">No {lower} listed yet</p>
            <p className="mt-1 text-gray-500">Be the first to hire — post a job and artisans will send you quotes.</p>
            <Link href="/post-job" className="btn-primary mt-4">Post a job</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              {services.length} {lower} {services.length === 1 ? "professional" : "professionals"} available
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ordered.map((s) => (
                <Link key={s.id} href={`/artisans/${s.artisan.id}`} className={`card p-5 transition hover:shadow-md ${isFeatured(s.artisan.featuredUntil) ? "ring-1 ring-amber-300" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="badge">{category.icon} {name}</span>
                    {isFeatured(s.artisan.featuredUntil) && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">⭐ Featured</span>
                    )}
                  </div>
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

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">{name}: frequently asked questions</h2>
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
