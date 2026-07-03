import Link from "next/link";
import CustomerLeadForm from "@/components/CustomerLeadForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Free No-Wahala Hiring Kit — hire artisans without getting scammed | NaijaArtisans",
  description:
    "Get the free No-Wahala Hiring Kit: 7 questions that stop artisans from scamming you, plus a fair-price guide for common jobs in Nigeria. Hire with confidence.",
  alternates: { canonical: "/hiring-kit" },
  openGraph: {
    title: "Free No-Wahala Hiring Kit — hire artisans without wahala",
    description: "7 questions to avoid being scammed + a fair-price guide for common jobs in Nigeria.",
    type: "website",
  },
};

const BENEFITS = [
  { icon: "🛑", title: "Stop getting scammed", text: "7 exact questions to ask before you pay any artisan a single naira." },
  { icon: "💰", title: "Know the fair price", text: "Price ranges for 10 common jobs so you never get overcharged again." },
  { icon: "🚩", title: "Spot the red flags", text: "The warning signs of a bad artisan — before they waste your money." },
  { icon: "✅", title: "Hire with confidence", text: "Then get free quotes from trusted, reviewed artisans near you." },
];

export default function HiringKitPage() {
  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Hiring Kit", url: "/hiring-kit" }])} />

      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              📩 Free download
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Never get scammed by an artisan again
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Get the free <strong>No-Wahala Hiring Kit</strong>: the 7 questions that expose bad
              artisans, plus a fair-price guide for common jobs in Nigeria — so you always know you're
              paying the right amount.
            </p>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <span>
                    <span className="block font-semibold">{b.title}</span>
                    <span className="text-sm text-brand-50">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-xl sm:p-8">
            <h2 className="text-xl font-bold">Get your free Hiring Kit</h2>
            <p className="mt-1 text-sm text-gray-500">Delivered instantly. No payment, ever.</p>
            <div className="mt-5">
              <CustomerLeadForm source="hiring-kit-landing" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14 text-center">
        <h2 className="text-2xl font-bold">Or skip straight to it</h2>
        <p className="mx-auto mt-2 max-w-xl text-gray-500">
          Ready to hire now? Post your job free and get quotes from trusted artisans near you.
        </p>
        <Link href="/post-job" className="btn-primary mt-5 inline-flex px-6 py-3">📝 Post a job — it's free</Link>
      </section>
    </div>
  );
}
