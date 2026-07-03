import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "List your business free — Get more jobs as an artisan",
  description:
    "Are you a plumber, electrician, tailor, mechanic, caterer or other artisan in Nigeria? List your services free on NaijaArtisans, get discovered by customers near you, and win more jobs. Sign up in under a minute.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "List your artisan business free | NaijaArtisans",
    description: "Get discovered by customers near you and win more jobs. Free to join.",
    type: "website",
  },
};

const BENEFITS = [
  { icon: "🆓", t: "Free to list", d: "Create your profile at no cost. No commission on jobs you win." },
  { icon: "📍", t: "Customers near you", d: "Get found by people in your city searching for your exact skill." },
  { icon: "⭐", t: "Build your reputation", d: "Collect ratings and reviews that win you even more work." },
  { icon: "💬", t: "Get job alerts", d: "See open jobs on the board and send quotes to win them." },
  { icon: "📱", t: "Works on your phone", d: "Manage everything from WhatsApp-style simplicity on mobile." },
  { icon: "🚀", t: "Grow with Featured", d: "Stand out at the top of search when you’re ready to scale." },
];

const STEPS = [
  { n: "1", t: "Create your free profile", d: "Your name, phone, city and what you do. Takes under a minute." },
  { n: "2", t: "List your services", d: "Add the work you do and your price range so customers know what to expect." },
  { n: "3", t: "Start winning jobs", d: "Customers contact you directly, or you send quotes on open jobs." },
];

const FAQS = [
  { q: "Is it really free to join?", a: "Yes. Creating your profile and listing your services is completely free. You only pay if you choose to promote your listing with a Featured or Pro plan." },
  { q: "How do customers reach me?", a: "Customers see your profile with your services, prices and reviews, and contact you directly. You also get to send quotes on jobs posted on the job board." },
  { q: "What do I need to sign up?", a: "Just your name, your city, and a phone number or email. You can add your services and a short bio in a minute." },
  { q: "Which cities can I join from?", a: "Anywhere in Nigeria — Lagos, Abuja, Port Harcourt, Kano, Ibadan and more. We’re growing city by city." },
];

export default function JoinPage({ searchParams }) {
  const ref = (searchParams?.ref || "").toString().trim();
  const registerHref = ref
    ? `/register?role=artisan&ref=${encodeURIComponent(ref)}`
    : "/register?role=artisan";

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "For Artisans", url: "/join" }])} />
      <JsonLd data={faqLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 to-brand-600 text-white">
        <div className="container-page py-16 sm:py-20">
          {ref ? (
            <div className="mb-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
              🎉 A fellow artisan invited you — welcome!
            </div>
          ) : (
            <Link href="/founding-artisan" className="mb-5 inline-block rounded-full bg-amber-300 px-4 py-1.5 text-sm font-bold text-amber-900 hover:bg-amber-200">
              🔥 First 100 artisans get 30 days Featured FREE — become a Founding Artisan →
            </Link>
          )}
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Get more jobs. Grow your business. 🛠️
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Get discovered by customers looking for skilled artisans across Nigeria. List your
              services free and reach people near you — in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/founding-artisan" className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50">
                Get free job leads — it’s free
              </Link>
              <Link href={registerHref} className="rounded-lg border border-white/50 px-6 py-3 font-semibold text-white hover:bg-white/10">
                List my business now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-page py-14">
        <h2 className="text-center text-2xl font-bold">Why artisans choose NaijaArtisans</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.t} className="card p-6">
              <div className="text-3xl">{b.icon}</div>
              <h3 className="mt-3 font-semibold">{b.t}</h3>
              <p className="mt-1 text-sm text-gray-500">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="container-page py-14">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={registerHref} className="btn-primary px-8 py-3">Create my free profile</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-14">
        <h2 className="text-center text-2xl font-bold">Questions, answered</h2>
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
        <div className="mt-10 text-center">
          <Link href={registerHref} className="btn-primary px-8 py-3">List my business free</Link>
          <p className="mt-3 text-sm text-gray-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
