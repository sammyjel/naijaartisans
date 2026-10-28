// Done-for-you packages: fixed-price digital work NaijaArtisans sells and has
// delivered by a freelancer (or by the owner). DB-free so prices and rules are
// testable; src/lib/dfy.js mirrors each package into the ServicePackage table
// when an order is placed, so this file is the single place to edit them.
//
// Money is in KOBO throughout (₦1 = 100 kobo), matching the schema.
//
// costKobo is what we expect to pay whoever does the work. It is never shown to
// customers; the admin order page uses it as the budget when assigning someone.
// Digital only, on purpose: a logo can be checked from anywhere before the
// customer sees it, a plumbing job cannot.

const N = 100; // kobo per naira

export const PACKAGES = [
  {
    slug: "logo-design",
    title: "Logo & Brand Starter",
    category: "Branding",
    icon: "🎨",
    summary: "A professional logo for your business, plus a business card and social profile picture.",
    description:
      "A logo designed for your business by a professional designer. You get two concepts to choose from, then we refine your favourite until you are happy (2 rounds of changes included). You receive every file you need for print, signage, WhatsApp and social media.",
    priceKobo: 25000 * N,
    costKobo: 12000 * N,
    depositPct: 50,
    turnaroundDays: 3,
    revisions: 2,
    active: true,
    deliverables: [
      "2 logo concepts, 1 final logo",
      "Files in PNG (transparent), JPG and PDF",
      "Business card design (front and back)",
      "Profile picture for WhatsApp, Instagram and Facebook",
    ],
    questions: [
      { id: "business", label: "Business name (exactly as it should appear)", required: true },
      { id: "what", label: "What does your business do, and who are your customers?", long: true, required: true },
      { id: "style", label: "Colours or styles you like (and any you don't)", long: true },
      { id: "examples", label: "Links to logos you like (optional)" },
    ],
  },
  {
    slug: "social-media-pack",
    title: "Social Media Content Pack",
    category: "Social media",
    icon: "📱",
    summary: "10 branded post designs with captions and hashtags, ready for Instagram, Facebook and WhatsApp Status.",
    description:
      "Ten eye-catching posts designed in your brand colours, each with a written caption and hashtags. Sized for Instagram, Facebook and WhatsApp Status so you can post for two to three weeks straight away.",
    priceKobo: 30000 * N,
    costKobo: 14000 * N,
    depositPct: 50,
    turnaroundDays: 5,
    revisions: 2,
    active: true,
    deliverables: [
      "10 post designs (square + Status/Story size)",
      "A caption and hashtags for every post",
      "Editable Canva link where possible",
      "A simple posting schedule",
    ],
    questions: [
      { id: "business", label: "Business name and what you sell", long: true, required: true },
      { id: "products", label: "Products, offers or messages to feature", long: true, required: true },
      { id: "platforms", label: "Where you post (Instagram, Facebook, WhatsApp, TikTok…)" },
      { id: "brand", label: "Logo link and brand colours (optional)" },
      { id: "tone", label: "Tone: fun, premium, Pidgin, formal…? (optional)" },
    ],
  },
  {
    slug: "advert-package",
    title: "Advert Package",
    category: "Advertising",
    icon: "📣",
    summary: "A flyer, a banner and 3 ready-to-run Facebook/Instagram ad designs with the ad text written for you.",
    description:
      "Everything you need to advertise a product, promo or event: a print-ready flyer that also works on WhatsApp, a banner or roll-up design, and three ad designs with headlines and text ready to paste into Facebook or Instagram ads.",
    priceKobo: 35000 * N,
    costKobo: 16000 * N,
    depositPct: 50,
    turnaroundDays: 4,
    revisions: 2,
    active: true,
    deliverables: [
      "1 flyer (print-ready PDF + WhatsApp image)",
      "1 banner or roll-up design",
      "3 ad designs for Facebook/Instagram",
      "Ad copy: 3 headlines + main text",
    ],
    questions: [
      { id: "offer", label: "What are you advertising? (product, promo, event, price, dates)", long: true, required: true },
      { id: "contact", label: "Contact details to show (phone, WhatsApp, address, social handles)", long: true, required: true },
      { id: "where", label: "Where will it run? (print, WhatsApp, Facebook ads, Instagram…)" },
      { id: "brand", label: "Logo link and brand colours (optional)" },
    ],
  },
  {
    slug: "cv-cover-letter",
    title: "CV & Cover Letter",
    category: "Careers",
    icon: "📄",
    summary: "A professional, ATS-friendly CV and a tailored cover letter that get you interviews.",
    description:
      "Your CV rewritten by a professional so it passes the recruitment software (ATS) employers use and shows your achievements clearly. Includes a cover letter tailored to the jobs you are applying for and a LinkedIn summary.",
    priceKobo: 15000 * N,
    costKobo: 7000 * N,
    depositPct: 50,
    turnaroundDays: 3,
    revisions: 2,
    active: true,
    deliverables: [
      "ATS-friendly CV (Word + PDF)",
      "Cover letter tailored to your target role",
      "LinkedIn headline and summary",
    ],
    questions: [
      { id: "cv", label: "Link to your current CV (Google Drive, Dropbox…) or paste it below", long: true, required: true },
      { id: "target", label: "What job or industry are you applying for, and in which country?", long: true, required: true },
      { id: "wins", label: "Your proudest achievements or skills (optional)", long: true },
    ],
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing Starter (1 month)",
    category: "Marketing",
    icon: "🚀",
    summary: "We set up your business online and run your social media for a month, including one ad campaign.",
    description:
      "A month of done-for-you marketing for a small business: we set up or tidy your Facebook and Instagram pages and your Google Business Profile, design and schedule 12 posts, set up one ad campaign, and send you a simple report at the end. Ad spend is paid by you, directly to Meta or Google.",
    priceKobo: 85000 * N,
    costKobo: 40000 * N,
    depositPct: 50,
    turnaroundDays: 30,
    revisions: 1,
    active: true,
    deliverables: [
      "Facebook + Instagram page setup or clean-up",
      "Google Business Profile setup (so you show on Google Maps)",
      "12 posts designed and scheduled over the month",
      "1 ad campaign set up (ad budget paid by you)",
      "End-of-month results report",
    ],
    questions: [
      { id: "business", label: "Business name, what you sell and your location", long: true, required: true },
      { id: "links", label: "Links to your existing pages or website (if any)", long: true },
      { id: "goal", label: "Main goal: more calls, more WhatsApp orders, more shop visitors…?", required: true },
      { id: "budget", label: "Monthly ad budget you can spend (e.g. ₦20,000)" },
    ],
  },
];

export const ORDER_STATUS_LABEL = {
  AWAITING_DEPOSIT: "Waiting for deposit",
  IN_PROGRESS: "In progress",
  AWAITING_BALANCE: "Ready for your review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function activePackages() {
  return PACKAGES.filter((p) => p.active);
}

export function packageBySlug(slug) {
  return PACKAGES.find((p) => p.slug === slug && p.active) || null;
}

/** Deposit rounded to whole naira so the customer never sees kobo. */
export function splitPrice(pkg) {
  const deposit = Math.round((pkg.priceKobo * pkg.depositPct) / 100 / N) * N;
  return { priceKobo: pkg.priceKobo, depositKobo: deposit, balanceKobo: pkg.priceKobo - deposit };
}

/** ₦ formatter for kobo amounts. */
export function nairaK(kobo) {
  return "₦" + Math.round((kobo || 0) / N).toLocaleString("en-NG");
}

/** Short code the customer quotes, e.g. NA-2610-4F2A. `rand` is 4 hex chars. */
export function orderReference(rand, now = new Date()) {
  const yymm = String(now.getUTCFullYear()).slice(2) + String(now.getUTCMonth() + 1).padStart(2, "0");
  return `NA-${yymm}-${String(rand).toUpperCase()}`;
}

/**
 * Checks the customer's brief against the package questions. Returns
 * { ok, answers, error }: trimmed answers keyed by question id, length-capped,
 * unknown keys dropped.
 */
export function validateBrief(pkg, raw) {
  const answers = {};
  for (const q of pkg.questions) {
    const v = String(raw?.[q.id] ?? "").trim().slice(0, q.long ? 3000 : 500);
    if (q.required && !v) return { ok: false, error: `Please answer: ${q.label}` };
    if (v) answers[q.id] = v;
  }
  return { ok: true, answers };
}

/**
 * Which payment the order is waiting for, and what its status becomes once
 * that payment lands. null when no payment is owed.
 */
export function pendingPayment(order) {
  if (order.status === "AWAITING_DEPOSIT") return { kind: "DEPOSIT", amountKobo: order.depositKobo, next: "IN_PROGRESS" };
  if (order.status === "AWAITING_BALANCE") return { kind: "BALANCE", amountKobo: order.balanceKobo, next: "COMPLETED" };
  return null;
}

/** A customer may ask for a change only on delivered work, within the allowance. */
export function canRequestRevision(order, pkg) {
  return order.status === "AWAITING_BALANCE" && order.revisionsUsed < (pkg?.revisions ?? 0);
}
