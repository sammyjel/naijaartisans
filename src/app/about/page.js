import Link from "next/link";

export const metadata = {
  title: "About — NaijaArtisans",
  description: "About NaijaArtisans: an Armut-style service marketplace connecting Nigerian artisans with customers.",
};

const TECH = [
  "Next.js 14 (App Router)",
  "React 18",
  "Prisma ORM",
  "PostgreSQL (Neon)",
  "Tailwind CSS",
  "JWT auth (http-only cookies)",
  "Deployed on Vercel",
];

const FEATURES = [
  "Email or phone sign-up with secure password hashing",
  "Artisans list services by category, city & price range",
  "Search & filter artisans by category and location",
  "Customers post jobs and receive quotes",
  "Ratings & reviews for artisans",
  "Role-aware dashboards for customers and artisans",
  "Responsive design — works on phone and desktop",
  "REST API ready to power a future mobile app",
];

export default function AboutPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <span className="badge">Portfolio project</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">About NaijaArtisans</h1>
        <p className="mt-4 text-lg text-gray-600">
          NaijaArtisans is a service marketplace that connects skilled Nigerian artisans —
          plumbers, electricians, tailors, caterers, mechanics and more — with customers who need
          their services. Inspired by Turkey&apos;s Armut and the global Thumbtack/TaskRabbit model,
          it&apos;s tailored for the Nigerian market.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-bold">The problem</h2>
            <p className="mt-2 text-sm text-gray-600">
              Finding a trustworthy artisan in Nigeria usually means relying on word-of-mouth.
              NaijaArtisans makes it easy to discover skilled hands nearby, compare quotes, and
              hire with confidence — while giving artisans a place to grow their business online.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-bold">How it works</h2>
            <p className="mt-2 text-sm text-gray-600">
              Customers search by category and city or post a job for free. Artisans list their
              services and send quotes on open jobs. After the work is done, customers leave a
              rating and review.
            </p>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-bold">Features</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600">✓</span> {f}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold">Built with</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TECH.map((t) => (
            <span key={t} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
              {t}
            </span>
          ))}
        </div>

        <div className="card mt-10 bg-brand-50 p-6">
          <h2 className="text-lg font-bold text-brand-800">Built by Sammy</h2>
          <p className="mt-2 text-sm text-brand-700">
            This is a full-stack portfolio project — design, frontend, backend, database and
            deployment. Feedback and opportunities are welcome.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="https://github.com/sammyjel/naijaartisans" target="_blank" rel="noopener noreferrer" className="btn-primary">
              View source on GitHub
            </a>
            <a href="mailto:sammyjel.ng@gmail.com" className="btn-outline">Get in touch</a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
