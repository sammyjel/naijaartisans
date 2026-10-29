import Link from "next/link";

export const metadata = {
  title: "Refund, Cancellation & Delivery Policy — NaijaArtisans",
  description: "When you can get a refund for NaijaArtisans upgrades and done-for-you services, how to cancel, and how digital orders are delivered.",
  alternates: { canonical: "/refund-policy" },
};

const UPDATED = "30 October 2026";
const SUPPORT = "sammyjel.ng@gmail.com";

export default function RefundPolicyPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-700">← Back to home</Link>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Refund, Cancellation &amp; Delivery Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {UPDATED}</p>

        <p className="mt-6 text-gray-700">
          NaijaArtisans is operated by <strong>DMBTREND LTD (RC 9910105)</strong>. This policy covers the only
          things you can pay us for on naijaartisans.com: <strong>listing upgrades</strong> for artisans
          (Featured and Pro) and our <strong>done-for-you</strong> digital services. Payments are processed
          by Paystack.
        </p>

        <Section title="1. What this policy does not cover">
          <p className="text-gray-700">
            Work you arrange with an artisan you found on NaijaArtisans (plumbing, tailoring, repairs and so on)
            is agreed and paid <strong>directly between you and the artisan</strong>. We do not take or hold that
            money, so we cannot refund it. If something goes wrong, see{" "}
            <a href="#disputes" className="text-brand-700 hover:underline">section 5</a>: we will help where we can.
          </p>
        </Section>

        <Section title="2. Featured and Pro upgrades">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>Each upgrade is a <strong>one-month</strong> payment (see <Link href="/pricing" className="text-brand-700 hover:underline">Pricing</Link>). It does <strong>not renew automatically</strong>, and your card is never charged again without you choosing to.</li>
            <li>To cancel, simply don’t renew. The upgrade stays active until the end of the month you paid for.</li>
            <li>Because the upgrade starts working as soon as you pay, a month that has started is not refundable, <strong>except</strong> when:
              <ul className="mt-1 list-[circle] space-y-1 pl-5">
                <li>you were charged twice for the same upgrade;</li>
                <li>you paid but the upgrade never activated on your profile and we could not fix it within 48 hours; or</li>
                <li>you were charged without authorising the payment.</li>
              </ul>
            </li>
            <li>Ask within <strong>7 days</strong> of the payment, with your Paystack receipt or reference.</li>
          </ul>
        </Section>

        <Section title="3. Done-for-you services">
          <p className="text-gray-700">
            Logo design, social media content, adverts, CV writing and digital marketing are sold and delivered by
            DMBTREND LTD. You pay a <strong>50% deposit</strong> to start and the <strong>balance only after you have
            seen and approved the work</strong>.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            <li><strong>Cancel before work starts</strong> (before we confirm someone is working on it): full refund of the deposit.</li>
            <li><strong>Cancel after work has started:</strong> the deposit covers the work already done and is not refunded, but you owe nothing more.</li>
            <li><strong>We miss the delivery date by more than 7 days</strong>, or cannot deliver at all: full refund of everything you have paid, if you ask for it.</li>
            <li><strong>Not happy with the preview?</strong> Each package includes the number of revisions shown on its page. Ask for changes from your order page before paying the balance.</li>
            <li><strong>After you have paid the balance and the final files have been delivered</strong>, the order is complete and is not refundable. If a file is missing or broken, tell us and we will fix it.</li>
          </ul>
        </Section>

        <Section title="4. Delivery (shipping)">
          <p className="text-gray-700">
            We sell <strong>no physical goods</strong> and ship nothing. Upgrades apply to your profile immediately after
            payment. Done-for-you work is delivered digitally: we post download links to your private order page and
            email you when they are ready. The delivery time for each package is shown on its page and starts when your
            deposit is confirmed.
          </p>
        </Section>

        <Section title="5. Disputes between customers and artisans" id="disputes">
          <p className="text-gray-700">
            If you have a problem with an artisan (poor work, no-show, misleading listing), email us with the job link and
            what happened. We will contact both sides, can remove false listings and reviews, and will suspend artisans who
            break our <Link href="/acceptable-use" className="text-brand-700 hover:underline">Acceptable Use Policy</Link>.
            We cannot force a refund for work paid directly to an artisan.
          </p>
        </Section>

        <Section title="6. How to ask for a refund">
          <p className="text-gray-700">
            Email <a href={`mailto:${SUPPORT}`} className="text-brand-700 hover:underline">{SUPPORT}</a> with your name, the
            email or phone on your account, and the Paystack reference (or your order number, like NA-2610-XXXX). We reply
            within 2 working days. Approved refunds go back to the original payment method through Paystack, usually within
            5–10 working days depending on your bank.
          </p>
        </Section>

        <p className="mt-10 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
          This policy sits alongside our <Link href="/terms" className="hover:underline">Terms of Service</Link>. Nothing in it
          limits any right you have under Nigerian consumer protection law.
        </p>
      </div>
    </div>
  );
}

function Section({ title, id, children }) {
  return (
    <section className="mt-8 scroll-mt-24" id={id}>
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
