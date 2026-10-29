import Link from "next/link";

export const metadata = {
  title: "Acceptable Use Policy — NaijaArtisans",
  description: "What is and isn't allowed on NaijaArtisans, how artisans are verified, and what happens when the rules are broken.",
  alternates: { canonical: "/acceptable-use" },
};

const UPDATED = "30 October 2026";
const SUPPORT = "sammyjel.ng@gmail.com";

export default function AcceptableUsePage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-700">← Back to home</Link>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Acceptable Use Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {UPDATED}</p>

        <p className="mt-6 text-gray-700">
          NaijaArtisans (naijaartisans.com), operated by <strong>DMBTREND LTD (RC 9910105)</strong>, helps customers in
          Nigeria find skilled artisans and post jobs. To keep it safe and useful, everyone who uses it, whether customer or
          artisan, agrees to this policy as part of our <Link href="/terms" className="text-brand-700 hover:underline">Terms of Service</Link>.
        </p>

        <Section title="1. Who can use NaijaArtisans">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>You must be 18 or older and give your real name and a phone number or email you control.</li>
            <li>One person or business per account. Do not impersonate anyone or list someone else’s work as yours.</li>
          </ul>
        </Section>

        <Section title="2. Services that may not be listed or requested">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>Anything illegal in Nigeria, or work that needs a licence you don’t hold.</li>
            <li>Weapons, ammunition, explosives, drugs or controlled substances.</li>
            <li>Adult or sexual services, escort services, or gambling.</li>
            <li>Fraud of any kind: advance-fee schemes, fake documents, “money doubling”, hacking, account recovery for other people’s accounts.</li>
            <li>Loans, investments, cryptocurrency trading or any service that takes money to hold or grow for someone.</li>
            <li>Counterfeit or stolen goods.</li>
          </ul>
        </Section>

        <Section title="3. Rules for artisans">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>List only trades you are genuinely skilled in, with honest prices and the area you really work in.</li>
            <li>Photos must be of your own work.</li>
            <li>Do not ask a customer for full payment before starting a job unless they freely agree. Never ask for payment to “release” a job, a quote or an account.</li>
            <li>Do not post fake reviews, ask friends to review you, or pay for reviews.</li>
            <li>Respond honestly, turn up when you say you will, and treat customers and their homes with respect.</li>
          </ul>
        </Section>

        <Section title="4. Rules for customers">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>Post real jobs only, with an honest description and location.</li>
            <li>Do not use job posts to advertise, collect phone numbers for marketing, or recruit for schemes.</li>
            <li>Reviews must be about a real job and a real experience.</li>
          </ul>
        </Section>

        <Section title="5. Conduct">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>No harassment, threats, hate speech or discrimination.</li>
            <li>No spam, and no misuse of other users’ contact details.</li>
            <li>No scraping, hacking, or attempts to overload or break the site.</li>
          </ul>
        </Section>

        <Section title="6. How we check artisans">
          <p className="text-gray-700">
            Every artisan signs up with a name, trade, city and phone number or email. We contact artisans by phone or
            WhatsApp to confirm their identity, trade and work area and ask for photos of real work. Those who pass get a{" "}
            <strong className="text-green-700">✓ Verified</strong> badge on their profile. Customer reviews and a count of
            customer-confirmed completed jobs are shown on each profile. NaijaArtisans does not pay artisans or hold money
            for them, so we never ask artisans for bank details. Always meet and agree the price and scope before work begins.
          </p>
        </Section>

        <Section title="7. What happens if the rules are broken">
          <p className="text-gray-700">
            We may remove listings, jobs or reviews, remove a Verified badge, or <strong>suspend</strong> an account. A
            suspended account is hidden from the site and cannot log in. Serious cases, such as fraud or threats, may be
            reported to the Nigeria Police Force or other authorities. Paid upgrades on an account suspended for breaking
            this policy are not refunded.
          </p>
        </Section>

        <Section title="8. Report a problem">
          <p className="text-gray-700">
            Seen a fake listing, a scam or abuse? Email{" "}
            <a href={`mailto:${SUPPORT}`} className="text-brand-700 hover:underline">{SUPPORT}</a> with the link to the profile
            or job and what happened. We review every report, usually within 2 working days.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
