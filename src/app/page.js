import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import SearchBar from "@/components/SearchBar";
import JsonLd from "@/components/JsonLd";
import { priceRange } from "@/lib/format";
import { CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "What is NaijaArtisans?",
    a: "NaijaArtisans is a service marketplace that connects skilled Nigerian artisans — plumbers, electricians, tailors, caterers, mechanics and more — with customers who need their services. You can browse artisans near you or post a job for free and receive quotes.",
  },
  {
    q: "How do I find an artisan near me?",
    a: "Search by the service you need and your city on the home page or the Browse page. You'll see artisan profiles with their services, price ranges, ratings and reviews so you can choose the best fit.",
  },
  {
    q: "Is it free to post a job?",
    a: "Yes. Posting a job on NaijaArtisans is completely free. Describe what you need and where, and artisans nearby will send you quotes.",
  },
  {
    q: "How do artisans get work on NaijaArtisans?",
    a: "Artisans register, list their services by category, city and price range, and send quotes on open jobs from the Job Board. Customers can also find and contact them directly from their profile.",
  },
  {
    q: "Which cities does NaijaArtisans cover?",
    a: "NaijaArtisans serves cities across Nigeria including Lagos, Abuja, Port Harcourt, Kano, Ibadan, Benin City and Enugu, with more being added.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Popular categories that have a matching photo in /public/images.
const POPULAR = [
  { slug: "plumbing", name: "Plumbing", img: "/images/plumbing.jpg" },
  { slug: "electrical", name: "Electrical", img: "/images/electrical.jpg" },
  { slug: "tailoring", name: "Tailoring & Fashion", img: "/images/tailoring.jpg" },
  { slug: "carpentry", name: "Carpentry", img: "/images/carpentry.jpg" },
  { slug: "auto-mechanic", name: "Auto Mechanic", img: "/images/mechanic.jpg" },
  { slug: "hairdressing", name: "Hairdressing & Barbing", img: "/images/hairdressing.jpg" },
];

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { services: true } } },
    }),
    prisma.service.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { category: true, artisan: { select: { id: true, name: true, city: true } } },
    }),
  ]);

  return (
    <div>
      {/* Hero with photo background */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Nigerian artisan at work"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        <div className="-z-10 absolute inset-0 bg-gradient-to-r from-brand-900/85 via-brand-800/70 to-brand-700/40" />
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl text-white">
            <h1 className="text-4xl font-extrabold leading-tight drop-shadow sm:text-5xl">
              Find trusted artisans near you in Nigeria
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Plumbers, electricians, tailors, caterers and more. Post a job for free and get quotes from skilled hands around you.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBar />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <Link href="/post-job" className="rounded-lg bg-white px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50">
                Post a job — it's free
              </Link>
              <Link href="/register?role=artisan" className="rounded-lg border border-white/50 px-4 py-2 font-semibold text-white hover:bg-white/10">
                Register as an artisan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular services with photos */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-bold">Popular services this week</h2>
        <p className="mt-1 text-gray-500">Tap a service to see artisans near you.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {POPULAR.map((p) => (
            <Link
              key={p.slug}
              href={`/services/${p.slug}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm"
            >
              <Image
                src={p.img}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="text-lg font-bold text-white drop-shadow">{p.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* All categories */}
      <section className="container-page pb-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Browse all categories</h2>
          <Link href="/services" className="text-sm font-semibold text-brand-700 hover:underline">All services →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/services/${c.slug}`}
              className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-2xl">{c.icon || "🛠️"}</span>
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="text-xs text-gray-400">{c._count.services} {c._count.services === 1 ? "pro" : "pros"}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by city */}
      <section className="container-page py-10">
        <h2 className="text-2xl font-bold">Find artisans by city</h2>
        <p className="mt-1 text-gray-500">Hire trusted hands in your area across Nigeria.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <Link
              key={city}
              href={`/browse?city=${encodeURIComponent(city)}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured services */}
      {featured.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">Recently listed</h2>
            <Link href="/browse" className="text-sm font-semibold text-brand-700 hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <Link key={s.id} href={`/artisans/${s.artisan.id}`} className="card p-5 transition hover:shadow-md">
                <span className="badge">{s.category.icon} {s.category.name}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{s.artisan.name} · {s.city}</span>
                  <span className="font-semibold text-brand-700">{priceRange(s.priceMin, s.priceMax)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-white">
        <div className="container-page py-14">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { n: "1", t: "Post your job", d: "Tell us what you need and where. It takes a minute and it's free." },
              { n: "2", t: "Get quotes", d: "Skilled artisans near you send their prices and messages." },
              { n: "3", t: "Hire & review", d: "Pick the best artisan, get the job done, then leave a review." },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {step.n}
                </div>
                <h3 className="mt-3 font-semibold">{step.t}</h3>
                <p className="mt-1 text-sm text-gray-500">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-14">
        <JsonLd data={faqLd} />
        <h2 className="text-center text-2xl font-bold">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-gray-200">
          {FAQS.map((f) => (
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
