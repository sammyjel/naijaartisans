import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import { SITE } from "@/lib/seo";

export const metadata = {
  title: "Your No-Wahala Hiring Kit | NaijaArtisans",
  robots: { index: false, follow: false },
};

const QUESTIONS = [
  "Can I see photos of your past work or your reviews?",
  "What's your full price — including materials and call-out fee?",
  "How long exactly will the job take?",
  "Do you give any guarantee if something goes wrong afterwards?",
  "Can you share one past customer I can call as a reference?",
  "Will you buy the materials or should I — and will you give receipts?",
  "What deposit do you need, and can we settle the balance on completion?",
];

const PRICES = [
  ["AC servicing (split unit)", "₦6,000 – ₦12,000"],
  ["AC installation (split unit)", "₦15,000 – ₦40,000"],
  ["Plumbing (minor fix / call-out)", "₦5,000 – ₦20,000"],
  ["Fridge / freezer repair", "₦8,000 – ₦25,000"],
  ["Generator servicing", "₦5,000 – ₦15,000"],
  ["Painting (per room)", "₦15,000 – ₦40,000"],
  ["Deep house cleaning", "₦20,000 – ₦60,000"],
  ["Fumigation (flat)", "₦10,000 – ₦30,000"],
  ["Native outfit (tailoring)", "₦8,000 – ₦40,000"],
  ["Phone screen replacement", "₦8,000 – ₦40,000"],
];

const REDFLAGS = [
  "Demands 100% payment upfront before starting.",
  "Has no reviews, no photos, and won't share any reference.",
  "Quotes a price far below everyone else (they'll cut corners or add charges later).",
  "Is vague about scope, timing, or what's included.",
  "Pressures you to decide immediately.",
];

export default function HiringKitThanks({ searchParams }) {
  const name = (searchParams?.name || "").toString().slice(0, 40) || "there";

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 p-8 text-center text-white shadow">
          <div className="text-5xl">📩</div>
          <h1 className="mt-3 text-3xl font-extrabold">Here's your kit, {name}!</h1>
          <p className="mt-2 text-brand-50">
            Save this page. Next time you hire anyone, run through it first — it'll save you money and
            wahala. We've also sent it to your WhatsApp. 📲
          </p>
        </div>

        {/* Post a job CTA — the core action */}
        <div className="card mt-6 bg-brand-50 p-6 text-center">
          <h2 className="text-lg font-bold text-brand-800">Skip the stress entirely</h2>
          <p className="mt-1 text-sm text-brand-700">
            Post your job free and get quotes from <strong>trusted, reviewed</strong> artisans near you —
            no cold-calling strangers.
          </p>
          <Link href="/post-job" className="btn-primary mt-4 inline-flex px-6 py-3">
            📝 Post my job free →
          </Link>
        </div>

        {/* 7 questions */}
        <div className="card mt-8 p-6">
          <span className="badge">🛑 Part 1</span>
          <h2 className="mt-3 text-xl font-bold">7 questions to ask before you pay anyone</h2>
          <ol className="mt-4 space-y-3">
            {QUESTIONS.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{i + 1}</span>
                <span className="text-gray-700">{q}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Fair price guide */}
        <div className="card mt-6 p-6">
          <span className="badge">💰 Part 2</span>
          <h2 className="mt-3 text-xl font-bold">Fair-price guide (common jobs)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Rough ranges to sanity-check a quote. Be suspicious of prices far below these.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-100">
                {PRICES.map(([job, range]) => (
                  <tr key={job}>
                    <td className="px-4 py-2.5 text-gray-700">{job}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-700">{range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Prices vary by city, brand and job size — use these as a guide, not gospel.
          </p>
        </div>

        {/* Red flags */}
        <div className="card mt-6 p-6">
          <span className="badge">🚩 Part 3</span>
          <h2 className="mt-3 text-xl font-bold">5 red flags of a bad artisan</h2>
          <ul className="mt-4 space-y-2">
            {REDFLAGS.map((r, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="text-red-500">🚩</span> {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Referral share */}
        <div className="card mt-6 p-6 text-center">
          <h2 className="text-lg font-bold">Know someone hiring an artisan soon? 🤝</h2>
          <p className="mt-1 text-sm text-gray-600">Send them this kit — it could save them from a costly mistake.</p>
          <div className="mt-4">
            <ShareButtons
              url={`${SITE.url}/hiring-kit`}
              title="Free No-Wahala Hiring Kit — 7 questions so artisans don't scam you + a fair-price guide 🇳🇬"
              label="Share the kit 👇"
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/browse" className="text-sm font-semibold text-brand-700 hover:underline">Browse trusted artisans →</Link>
        </div>
      </div>
    </div>
  );
}
