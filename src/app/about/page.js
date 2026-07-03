import Link from "next/link";

export const metadata = {
  title: "About — NaijaArtisans",
  description: "NaijaArtisans connects skilled Nigerian artisans with customers who need them — across all 36 states and the FCT.",
  alternates: { canonical: "/about" },
};

const FEATURES = [
  "Find trusted artisans by service and city",
  "See prices, working hours, photos and reviews",
  "Contact artisans directly by call, WhatsApp or email",
  "Post a job for free and get quotes",
  "Artisans get a free profile to grow their business",
  "Available across all 36 states and the FCT",
];

export default function AboutPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <span className="badge">🇳🇬 Built for Nigeria</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">About NaijaArtisans</h1>
        <p className="mt-4 text-lg text-gray-600">
          NaijaArtisans is a service marketplace that connects skilled Nigerian artisans —
          plumbers, electricians, tailors, caterers, mechanics and more — with customers who need
          their services. Our mission is simple: make it easy to find reliable hands near you, and
          help hardworking artisans reach more customers.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-bold">The problem we solve</h2>
            <p className="mt-2 text-sm text-gray-600">
              Finding a trustworthy artisan in Nigeria too often means relying on word-of-mouth and
              hoping for the best. NaijaArtisans lets you discover skilled hands nearby, compare
              options and reviews, and hire with confidence.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-bold">How it works</h2>
            <p className="mt-2 text-sm text-gray-600">
              Customers search by service and city, or post a job for free. Artisans create a profile,
              list their services and connect with customers. After the work is done, customers leave a
              rating and review to help others.
            </p>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-bold">What you can do</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600">✓</span> {f}
            </li>
          ))}
        </ul>

        {/* Who we are — E-E-A-T */}
        <h2 className="mt-10 text-xl font-bold">Who's behind NaijaArtisans</h2>
        <p className="mt-3 text-gray-600">
          NaijaArtisans is built and run by a small founding team of Nigerians who know the problem
          first-hand. We&apos;ve all been there — the plumber who never shows up, the "my guy" who
          rushes the job, the fear of being overcharged because you don&apos;t know what a fair price
          looks like. We built this platform to fix exactly that: a simple, trustworthy way to find
          skilled hands near you, and a place where honest artisans can be found for their work.
        </p>
        <p className="mt-3 text-gray-600">
          We&apos;re based in Nigeria and focused entirely on the Nigerian market — from Lagos to Kano,
          Port Harcourt to Maiduguri, across all 36 states and the FCT. Everything we publish, from our{" "}
          <Link href="/guides" className="text-brand-700 hover:underline">hiring guides</Link> to our
          fair-price ranges, comes from real local knowledge of how these trades actually work here.
        </p>

        {/* Values */}
        <h2 className="mt-10 text-xl font-bold">What we stand for</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold">🤝 Trust &amp; safety</h3>
            <p className="mt-1 text-sm text-gray-600">Real reviews and transparent profiles so you always know who you&apos;re hiring.</p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">💰 Fair, transparent pricing</h3>
            <p className="mt-1 text-sm text-gray-600">We publish honest price ranges so no one gets overcharged or underpaid.</p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">🛠️ Supporting local artisans</h3>
            <p className="mt-1 text-sm text-gray-600">Free profiles that help hardworking Nigerians grow their business online.</p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">🔒 Your privacy</h3>
            <p className="mt-1 text-sm text-gray-600">We protect your data in line with the Nigeria Data Protection Act 2023.</p>
          </div>
        </div>

        <div className="card mt-10 bg-brand-50 p-6">
          <h2 className="text-lg font-bold text-brand-800">Join the community</h2>
          <p className="mt-2 text-sm text-brand-700">
            Whether you need a job done or you’re a skilled artisan ready to grow, NaijaArtisans is
            free to get started.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/register?role=artisan" className="btn-primary">List your services</Link>
            <Link href="/browse" className="btn-outline">Find an artisan</Link>
          </div>
          <p className="mt-4 text-sm text-brand-700">
            Questions? Email{" "}
            <a href="mailto:support@naijaartisans.com" className="font-medium underline">support@naijaartisans.com</a>.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
