import Link from "next/link";

export const metadata = {
  title: "Help & FAQ — NaijaArtisans",
  description: "Answers to common questions for customers and artisans on NaijaArtisans.",
  alternates: { canonical: "/help" },
};

const CUSTOMER_FAQ = [
  {
    q: "How do I find an artisan?",
    a: "Use the search on the home page or the Find Artisans page — pick a service and your city. You can also post a job for free and let artisans send you quotes.",
  },
  {
    q: "Does it cost anything to hire?",
    a: "No. Searching for artisans and posting a job is completely free for customers. You only pay the artisan directly for the work you agree on.",
  },
  {
    q: "How do I contact an artisan?",
    a: "Open their profile and tap Call, WhatsApp or email. Always agree the scope of work and price before the job starts.",
  },
  {
    q: "How do reviews work?",
    a: "After a job, you can leave a star rating and review on the artisan's profile. Honest reviews help everyone hire with confidence.",
  },
  {
    q: "Is my information safe?",
    a: "Yes. We protect your data in line with the Nigeria Data Protection Act 2023 — see our Privacy Policy. Your exact location is never shown publicly.",
  },
];

const ARTISAN_FAQ = [
  {
    q: "How do I join as an artisan?",
    a: "Tap Sign up, choose “I'm an artisan”, and create your free profile with your trade, services, prices, working hours and (optionally) a photo and location.",
  },
  {
    q: "Is it free to list my services?",
    a: "Yes — creating a profile and listing services is free. Optional Featured and Pro plans boost your visibility (see Pricing).",
  },
  {
    q: "How do customers reach me?",
    a: "Customers see your profile and contact you directly by phone, WhatsApp or email, and can send you job quotes.",
  },
  {
    q: "How do I get more jobs?",
    a: "Complete your profile, add a clear photo, list fair prices, set your working hours, and ask happy customers to leave reviews. A Featured listing puts you at the top of search results.",
  },
  {
    q: "How do I add my photo or location?",
    a: "Log in and open your Dashboard — you can upload a profile photo and share your location there at any time.",
  },
];

export default function HelpPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-700">← Back to home</Link>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Help &amp; FAQ</h1>
        <p className="mt-3 text-lg text-gray-600">
          Quick answers for customers and artisans. Can’t find what you need? Email{" "}
          <a href="mailto:support@naijaartisans.com" className="font-medium text-brand-700 hover:underline">support@naijaartisans.com</a>.
        </p>

        <h2 className="mt-10 text-xl font-bold">For customers</h2>
        <div className="mt-4 space-y-3">
          {CUSTOMER_FAQ.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <h2 className="mt-10 text-xl font-bold">For artisans</h2>
        <div className="mt-4 space-y-3">
          {ARTISAN_FAQ.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <div className="card mt-12 bg-brand-50 p-6 text-center">
          <h2 className="text-lg font-bold text-brand-800">Still need help?</h2>
          <p className="mt-2 text-sm text-brand-700">
            We’re here for you. Reach our support team and we’ll get back to you.
          </p>
          <a href="mailto:support@naijaartisans.com" className="btn-primary mt-4 inline-flex">
            Email support
          </a>
        </div>
      </div>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <details className="card group p-5">
      <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:hidden">
        <span className="flex items-center justify-between gap-3">
          {q}
          <span className="text-brand-600 transition group-open:rotate-45">＋</span>
        </span>
      </summary>
      <p className="mt-3 text-sm text-gray-600">{a}</p>
    </details>
  );
}
