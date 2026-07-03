import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import { SITE } from "@/lib/seo";

export const metadata = {
  title: "You're in — Founding Artisan | NaijaArtisans",
  robots: { index: false, follow: false },
};

const GUIDE = [
  { t: "Complete your profile 100%", d: "Add your photo, clear prices and working hours. Profiles with a photo and prices get far more calls than empty ones." },
  { t: "Show your work", d: "Upload before/after photos of past jobs. For tailors, carpenters, painters and caterers, seeing the work is what wins the customer." },
  { t: "Get reviews — always ask", d: "After every job say: “If you were happy, please drop me a quick review on my NaijaArtisans page — it helps me a lot.” 5 reviews beats any advert." },
  { t: "Reply fast", d: "The artisan who responds first usually gets the job. Keep WhatsApp notifications on and answer quickly." },
  { t: "Share your profile everywhere", d: "Put your profile link on your WhatsApp status, in your bio, and in local groups. It's your free 24/7 advert." },
  { t: "Price clearly and fairly", d: "Show a price range instead of “call for price.” Customers skip listings with no prices." },
  { t: "Show up and communicate", d: "Arrive on time, give updates, finish clean. Repeat customers and referrals are where the real money is." },
];

export default function FoundingArtisanThanks({ searchParams }) {
  const name = (searchParams?.name || "").toString().slice(0, 40) || "there";

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        {/* Excitement */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 p-8 text-center text-white shadow">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-extrabold">You're in, {name}!</h1>
          <p className="mt-2 text-brand-50">
            You're now a NaijaArtisans <strong>Founding Artisan</strong>. We'll reach you on WhatsApp
            shortly — keep an eye on it. 📲
          </p>
        </div>

        {/* Perks unlocked */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "⭐", t: "30 days Featured — FREE" },
            { icon: "📩", t: "Free job leads near you" },
            { icon: "🏆", t: "Founding Artisan badge" },
          ].map((p) => (
            <div key={p.t} className="card p-4 text-center">
              <div className="text-2xl">{p.icon}</div>
              <div className="mt-1 text-sm font-semibold">{p.t}</div>
            </div>
          ))}
        </div>

        {/* Next step */}
        <div className="card mt-6 bg-brand-50 p-6 text-center">
          <h2 className="text-lg font-bold text-brand-800">Your next step (2 minutes)</h2>
          <p className="mt-1 text-sm text-brand-700">
            Finish your free profile so customers can find and hire you — and claim your 30 days of
            Featured placement.
          </p>
          <Link href="/register?role=artisan" className="btn-primary mt-4 inline-flex px-6 py-3">
            Complete my free profile →
          </Link>
        </div>

        {/* The free guide, delivered instantly */}
        <div className="card mt-8 p-6">
          <span className="badge">📘 Your free guide</span>
          <h2 className="mt-3 text-xl font-bold">
            How to get 10+ customers a month as an artisan in Nigeria — without ad spend
          </h2>
          <ol className="mt-4 space-y-4">
            {GUIDE.map((g, i) => (
              <li key={g.t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold">{g.t}</span>
                  <span className="text-sm text-gray-600">{g.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Referral loop */}
        <div className="card mt-6 p-6 text-center">
          <h2 className="text-lg font-bold">Know other artisans? 🤝</h2>
          <p className="mt-1 text-sm text-gray-600">
            Invite plumbers, electricians, tailors or mechanics you know. Every artisan who joins earns
            you <strong>extra free Featured days</strong>.
          </p>
          <div className="mt-4">
            <ShareButtons
              url={`${SITE.url}/founding-artisan`}
              title="Join me as a Founding Artisan on NaijaArtisans — free job leads near you, no ad spend."
              label="Share with an artisan 👇"
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
