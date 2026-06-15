import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { priceRange, timeAgo } from "@/lib/format";
import Stars from "@/components/Stars";
import ReviewForm from "@/components/ReviewForm";
import JsonLd from "@/components/JsonLd";
import ShareButtons from "@/components/ShareButtons";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const artisan = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      name: true, city: true, bio: true, role: true,
      services: { select: { category: { select: { name: true } } }, take: 1 },
    },
  });
  if (!artisan || artisan.role !== "ARTISAN") return { title: "Artisan not found" };

  const trade = artisan.services[0]?.category?.name;
  const where = artisan.city ? ` in ${artisan.city}` : "";
  const title = trade ? `${artisan.name} — ${trade}${where}` : `${artisan.name} — Artisan${where}`;
  const description = (artisan.bio || `Hire ${artisan.name}, a trusted ${trade ? trade.toLowerCase() : "artisan"}${where} on NaijaArtisans. See services, prices and reviews.`).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/artisans/${params.id}` },
    openGraph: { title: `${title} | NaijaArtisans`, description, type: "profile" },
  };
}

export default async function ArtisanProfilePage({ params }) {
  const [artisan, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, city: true, bio: true, role: true, phone: true, email: true, createdAt: true,
        services: { include: { category: true }, orderBy: { createdAt: "desc" } },
        reviewsGot: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!artisan || artisan.role !== "ARTISAN") notFound();

  const ratings = artisan.reviewsGot.map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const loggedIn = Boolean(viewer);

  const businessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: artisan.name,
    url: `${SITE.url}/artisans/${artisan.id}`,
    description: artisan.bio || undefined,
    image: SITE.logo,
    areaServed: artisan.city || "Nigeria",
    address: artisan.city
      ? { "@type": "PostalAddress", addressLocality: artisan.city, addressCountry: "NG" }
      : undefined,
    ...(ratings.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avg.toFixed(1),
            reviewCount: ratings.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(artisan.reviewsGot.length
      ? {
          review: artisan.reviewsGot.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.author.name },
            reviewBody: r.comment || undefined,
          })),
        }
      : {}),
    makesOffer: artisan.services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.title, category: s.category.name },
    })),
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={businessLd} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", url: "/" },
          { name: "Browse artisans", url: "/browse" },
          { name: artisan.name, url: `/artisans/${artisan.id}` },
        ])}
      />
      <Link href="/browse" className="text-sm text-gray-500 hover:text-brand-700">← Back to results</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* Left: profile + services */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                {artisan.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{artisan.name}</h1>
                <p className="text-gray-500">{artisan.city || "Nigeria"} · Joined {timeAgo(artisan.createdAt)}</p>
                <div className="mt-2"><Stars value={avg} count={ratings.length} /></div>
              </div>
            </div>
            {artisan.bio && <p className="mt-4 text-gray-700">{artisan.bio}</p>}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold">Services offered</h2>
            {artisan.services.length === 0 ? (
              <p className="mt-2 text-gray-500">This artisan hasn't listed any services yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {artisan.services.map((s) => (
                  <div key={s.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="badge">{s.category.icon} {s.category.name}</span>
                      <span className="font-semibold text-brand-700">{priceRange(s.priceMin, s.priceMax)}</span>
                    </div>
                    <h3 className="mt-2 font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                    <p className="mt-2 text-xs text-gray-400">{s.city}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="card p-6">
            <h2 className="text-lg font-bold">Reviews ({ratings.length})</h2>
            <div className="mt-4 space-y-4">
              {artisan.reviewsGot.length === 0 ? (
                <p className="text-gray-500">No reviews yet. Be the first!</p>
              ) : (
                artisan.reviewsGot.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.author.name}</span>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(r.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="mb-3 font-semibold">Leave a review</h3>
              <ReviewForm targetId={artisan.id} />
            </div>
          </div>
        </div>

        {/* Right: contact */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Contact {artisan.name.split(" ")[0]}</h2>
            {loggedIn ? (
              <div className="mt-4 space-y-3">
                {artisan.phone && (
                  <a href={`tel:${artisan.phone}`} className="btn-primary w-full">📞 Call {artisan.phone}</a>
                )}
                {artisan.phone && (
                  <a
                    href={`https://wa.me/234${artisan.phone.replace(/^0/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {artisan.email && (
                  <a href={`mailto:${artisan.email}`} className="btn-outline w-full">✉️ {artisan.email}</a>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Log in to see contact details and reach this artisan.</p>
                <Link href="/login" className="btn-primary mt-3 w-full">Log in to contact</Link>
              </div>
            )}
          </div>

          <div className="card bg-brand-50 p-6">
            <h3 className="font-semibold text-brand-800">Need something specific?</h3>
            <p className="mt-1 text-sm text-brand-700">Post a job and get quotes from multiple artisans.</p>
            <Link href="/post-job" className="btn-primary mt-3 w-full">Post a job</Link>
          </div>

          <div className="card p-6">
            <ShareButtons
              url={`${SITE.url}/artisans/${artisan.id}`}
              title={`${artisan.name}${artisan.services[0]?.category ? ` — ${artisan.services[0].category.name}` : ""}${artisan.city ? ` in ${artisan.city}` : ""}`}
              label="Know someone who needs this? Share 👇"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
