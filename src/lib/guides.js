// Original editorial content — hiring guides for the Nigerian market.
// Each guide is structured as blocks so it renders as clean, semantic HTML.

export const GUIDE_AUTHOR = "NaijaArtisans Editorial Team";

export const GUIDES = [
  {
    slug: "how-to-hire-a-plumber-in-lagos",
    title: "How to Hire a Trusted Plumber in Lagos (2026 Prices & Checklist)",
    description:
      "A practical guide to hiring a reliable plumber in Lagos — what jobs cost in 2026, the questions to ask, and the red flags that signal a bad hire.",
    trade: "Plumbing",
    city: "Lagos",
    updated: "June 2026",
    readMins: 6,
    body: [
      { type: "p", text: "A burst pipe or a blocked drain never waits for a convenient time. In Lagos, the difference between a plumber who fixes the problem once and one who keeps coming back is knowing what to look for before you hand over any money. This guide walks you through fair prices, the right questions, and the warning signs — so you hire right the first time." },
      { type: "h2", text: "What plumbing work costs in Lagos (2026)" },
      { type: "p", text: "Prices vary by the size of the job, the parts needed, and whether it's an emergency call-out. Use these ranges to sanity-check any quote — a price far below the low end usually means corners will be cut." },
      { type: "price", rows: [
        ["Minor fix / call-out (leaking tap, small leak)", "₦5,000 – ₦20,000"],
        ["Blocked drain or toilet", "₦8,000 – ₦25,000"],
        ["Water heater installation", "₦15,000 – ₦45,000"],
        ["Full bathroom plumbing (new)", "₦80,000 – ₦300,000+"],
        ["Borehole / pump connection", "₦20,000 – ₦120,000"],
      ] },
      { type: "h2", text: "5 questions to ask before hiring" },
      { type: "ol", items: [
        "Can I see photos of similar jobs you've done, or your reviews?",
        "What's the full price — including parts and call-out — before you start?",
        "How long will the repair take?",
        "Do you guarantee the work if the leak returns within a few weeks?",
        "Will you buy the materials, and can you show me the receipts?",
      ] },
      { type: "h2", text: "Red flags to walk away from" },
      { type: "ul", items: [
        "Demands the full amount upfront before doing any work.",
        "Can't show a single past job, review, or reference.",
        "Quotes far below every other plumber — then adds 'extra' charges later.",
        "Is vague about what's included or how long it will take.",
      ] },
      { type: "tip", text: "Agree the price in writing (even a WhatsApp message) before work starts, and pay a reasonable deposit — never 100% upfront. Settle the balance when the job is done and tested." },
      { type: "h2", text: "The easier way to find a plumber" },
      { type: "p", text: "Instead of calling random numbers, you can post your job for free on NaijaArtisans and get quotes from plumbers near you — each with reviews, prices and photos so you can compare before you choose. It takes the guesswork out of hiring." },
    ],
  },
  {
    slug: "ac-servicing-installation-prices-nigeria",
    title: "AC Servicing & Installation Prices in Nigeria (2026 Guide)",
    description:
      "How much AC servicing, installation and gas refill should cost in Nigeria in 2026 — plus how to tell a real AC technician from a quack.",
    trade: "AC & Refrigeration",
    updated: "June 2026",
    readMins: 5,
    body: [
      { type: "p", text: "In Nigeria's heat, a working air conditioner isn't a luxury — it's survival. But AC work is also where a lot of customers get overcharged or get a 'repair' that fails a week later. Here's what fair prices look like in 2026 and how to hire a technician who actually knows what they're doing." },
      { type: "h2", text: "Typical AC prices in 2026" },
      { type: "price", rows: [
        ["Servicing (split unit)", "₦6,000 – ₦12,000"],
        ["Gas refill (R22 / R410)", "₦8,000 – ₦25,000"],
        ["Installation (split unit)", "₦15,000 – ₦40,000"],
        ["Compressor replacement", "₦40,000 – ₦120,000"],
        ["Uninstall & reinstall (moving house)", "₦12,000 – ₦30,000"],
      ] },
      { type: "h2", text: "How to spot a real AC technician" },
      { type: "ul", items: [
        "They check the gas pressure with a gauge, not by guessing.",
        "They explain the actual fault instead of just saying 'it needs gas'.",
        "They clean the filters and coils during a service, not just spray water.",
        "They offer a short guarantee on the work.",
      ] },
      { type: "tip", text: "If a technician says your AC 'needs gas' every few weeks, the real problem is usually a leak — refilling gas repeatedly is money wasted. Insist they find and fix the leak." },
      { type: "h2", text: "Before you pay" },
      { type: "p", text: "Ask for the full price including gas and call-out, confirm what guarantee you get, and never pay in full before the unit is tested and cooling properly. On NaijaArtisans you can compare AC technicians near you by their reviews and prices before booking." },
    ],
  },
  {
    slug: "how-to-find-a-reliable-electrician-in-nigeria",
    title: "How to Find a Reliable Electrician in Nigeria (Safety Guide)",
    description:
      "Bad wiring causes fires and ruins appliances. Here's how to hire a competent, safety-conscious electrician in Nigeria — and what common jobs should cost.",
    trade: "Electrical",
    updated: "June 2026",
    readMins: 6,
    body: [
      { type: "p", text: "Electrical work is the one trade where hiring cheap can literally burn your house down. A good electrician protects your appliances and your family; a bad one leaves hidden faults that surface months later. This guide helps you tell the difference." },
      { type: "h2", text: "What electrical jobs cost in Nigeria (2026)" },
      { type: "price", rows: [
        ["Fault tracing / minor repair", "₦5,000 – ₦20,000"],
        ["Socket or switch installation (each)", "₦2,000 – ₦6,000"],
        ["Full house wiring (per room)", "₦15,000 – ₦50,000"],
        ["Distribution board / change-over", "₦25,000 – ₦120,000"],
        ["Inverter & battery installation", "₦60,000 – ₦500,000+"],
      ] },
      { type: "h2", text: "Signs of a competent electrician" },
      { type: "ul", items: [
        "Uses proper cable sizes and quality materials, and can explain why.",
        "Tests the circuit and earthing before calling the job done.",
        "Doesn't leave exposed joints or overloaded sockets.",
        "Is comfortable giving you a guarantee on the work.",
      ] },
      { type: "h2", text: "Questions that reveal a quack" },
      { type: "ol", items: [
        "How will you protect my appliances from power surges?",
        "What cable size are you using for this load, and why?",
        "Will the work be earthed and tested before you leave?",
      ] },
      { type: "tip", text: "Insist on quality materials even if it costs a little more. Cheap cables and fittings are the number-one cause of electrical fires and appliance damage in Nigerian homes." },
      { type: "h2", text: "Hire with confidence" },
      { type: "p", text: "Post your electrical job free on NaijaArtisans and get quotes from electricians near you — with reviews from other customers so you can see who does safe, lasting work before you hire." },
    ],
  },
  {
    slug: "tailoring-prices-nigeria",
    title: "What It Costs to Sew Native & English Wears in Nigeria (2026)",
    description:
      "A price guide for tailoring in Nigeria — agbada, kaftan, gowns, suits and Ankara styles — plus how to choose a tailor who delivers on time.",
    trade: "Tailoring & Fashion",
    updated: "June 2026",
    readMins: 5,
    body: [
      { type: "p", text: "Every Nigerian knows the pain of a tailor who collects your material, promises 'next week', and disappears until the owambe is two days away. Choosing the right tailor — and agreeing terms clearly — saves you that stress. Here's what to expect on price and how to pick well." },
      { type: "h2", text: "Typical tailoring prices (workmanship only)" },
      { type: "price", rows: [
        ["Simple Ankara top / skirt", "₦4,000 – ₦12,000"],
        ["Native (kaftan / senator)", "₦8,000 – ₦25,000"],
        ["Agbada (full set)", "₦25,000 – ₦80,000"],
        ["Ladies' gown (occasion)", "₦15,000 – ₦70,000"],
        ["English suit (2-piece)", "₦30,000 – ₦120,000"],
      ] },
      { type: "p", text: "These are workmanship prices — the fabric is usually separate. High-end designers and heavy bead/stone work cost more." },
      { type: "h2", text: "How to choose a tailor who delivers" },
      { type: "ul", items: [
        "Look at photos of their finished work — fit and finishing tell you everything.",
        "Agree a clear delivery date, and build in buffer before your event.",
        "Confirm the price and what's included before handing over material.",
        "Start with one simple piece before trusting them with expensive fabric.",
      ] },
      { type: "tip", text: "For events, give your tailor at least two weeks and a firm 'ready for fitting' date — not just the event date. It's the single best way to avoid last-minute disappointment." },
      { type: "h2", text: "Find a tailor near you" },
      { type: "p", text: "Browse tailors and fashion designers on NaijaArtisans by city, see their past work and reviews, and message them directly on WhatsApp before you commit." },
    ],
  },
  {
    slug: "generator-repair-nigeria",
    title: "Generator Repair in Nigeria: Common Faults & Fair Prices (2026)",
    description:
      "From carburettor problems to AVR faults — the most common generator issues in Nigeria, what repairs should cost, and how to avoid being overcharged.",
    trade: "Generator Repair",
    updated: "June 2026",
    readMins: 5,
    body: [
      { type: "p", text: "When the light goes and your gen won't start, you're at the mercy of whoever shows up. Knowing the common faults and their fair prices puts you back in control and stops a small repair turning into a big bill." },
      { type: "h2", text: "Common generator faults" },
      { type: "ul", items: [
        "Won't start — often a dirty carburettor, bad plug, or stale fuel.",
        "Starts but no output — frequently a faulty AVR (voltage regulator).",
        "Smoking or overheating — oil, cooling or overload issues.",
        "Cuts off under load — fuel delivery or capacitor problems.",
      ] },
      { type: "h2", text: "Fair repair prices (2026)" },
      { type: "price", rows: [
        ["General servicing (oil, plug, filter)", "₦5,000 – ₦15,000"],
        ["Carburettor clean / rebuild", "₦5,000 – ₦20,000"],
        ["AVR replacement", "₦6,000 – ₦25,000"],
        ["Capacitor replacement", "₦3,000 – ₦10,000"],
        ["Coil rewinding", "₦15,000 – ₦60,000"],
      ] },
      { type: "tip", text: "Ask the technician to show you the faulty part they replaced. A trustworthy repairer has no problem doing this — and it stops the old trick of 'replacing' parts that were never bad." },
      { type: "h2", text: "Prevent the next breakdown" },
      { type: "p", text: "Service your generator regularly, use clean fuel, and don't overload it. To find a reliable generator technician near you, post the job free on NaijaArtisans and compare quotes and reviews." },
    ],
  },
  {
    slug: "how-to-avoid-artisan-scams-nigeria",
    title: "7 Signs of a Bad Artisan (and How to Avoid Getting Scammed)",
    description:
      "The warning signs every Nigerian should know before hiring any artisan — and a simple system to protect your money on every job.",
    trade: "General",
    updated: "June 2026",
    readMins: 6,
    body: [
      { type: "p", text: "Most artisans in Nigeria are honest, hardworking people. But the few bad ones cost customers billions every year in shoddy work and vanished deposits. These seven warning signs — and one simple hiring system — will keep you on the safe side." },
      { type: "h2", text: "The 7 red flags" },
      { type: "ol", items: [
        "They demand 100% payment before starting any work.",
        "They have no reviews, no photos of past jobs, and no reference you can call.",
        "Their price is far below everyone else's (they'll cut corners or add charges later).",
        "They're vague about scope, timing, or what's included.",
        "They pressure you to decide 'now now' before you can think.",
        "They won't put anything — price or scope — in writing.",
        "They avoid giving any guarantee if the work fails.",
      ] },
      { type: "h2", text: "The simple system that protects you" },
      { type: "ol", items: [
        "Check their work: ask for photos, reviews, or a reference before anything else.",
        "Agree everything in writing: price, scope, timeline — a WhatsApp message counts.",
        "Pay a fair deposit, never the full amount, and settle the balance on completion.",
        "Inspect and test the work before you make the final payment.",
      ] },
      { type: "tip", text: "The strongest protection is choosing artisans who have public reviews. A tradesperson with a reputation to protect behaves very differently from an anonymous stranger." },
      { type: "h2", text: "Hire from people with a track record" },
      { type: "p", text: "On NaijaArtisans, every artisan has a profile with reviews, prices and photos — so you're never hiring blind. Post your job free and choose from people other customers already trust." },
    ],
  },
  {
    slug: "house-painting-cost-nigeria",
    title: "House Painting Cost in Nigeria: A Per-Room Guide (2026)",
    description:
      "What it costs to paint a room, a flat or a whole house in Nigeria in 2026 — labour vs materials, and how to get a fair, clear quote.",
    trade: "Painting",
    updated: "June 2026",
    readMins: 5,
    body: [
      { type: "p", text: "Painting transforms a home, but quotes can swing wildly depending on paint quality, surface prep and whether the painter charges by room, by area, or per day. Here's how to understand what you're paying for." },
      { type: "h2", text: "Typical painting prices (labour)" },
      { type: "price", rows: [
        ["Single room (repaint)", "₦15,000 – ₦40,000"],
        ["2-bedroom flat (repaint)", "₦60,000 – ₦150,000"],
        ["Full 3-bedroom (new / detailed)", "₦150,000 – ₦400,000"],
        ["Screeding / surface prep (per room)", "₦10,000 – ₦30,000"],
        ["Exterior wall (per house)", "₦100,000 – ₦500,000+"],
      ] },
      { type: "p", text: "Paint is usually separate. Emulsion, satin and textured finishes all cost differently, so agree the exact paint type and brand up front." },
      { type: "h2", text: "Get a fair quote" },
      { type: "ul", items: [
        "Ask whether the price is labour-only or includes paint and materials.",
        "Confirm surface prep is included — good prep is what makes paint last.",
        "Agree the number of coats (two is standard for a solid finish).",
        "See photos of previous jobs for the quality of edges and finishing.",
      ] },
      { type: "tip", text: "Cheap paint and skipped prep look fine for a month, then peel and stain. Spend a little more on quality materials — it costs far less than repainting a year later." },
      { type: "h2", text: "Find a painter near you" },
      { type: "p", text: "Compare painters on NaijaArtisans by their reviews and past work, and get clear quotes before you start. Post your job free to receive offers from painters in your city." },
    ],
  },
  {
    slug: "how-to-hire-a-mechanic-in-nigeria",
    title: "How to Hire a Mechanic You Can Trust in Nigeria",
    description:
      "Tired of mechanics who create new faults? Here's how to find an honest mechanic in Nigeria, what common jobs cost, and how to avoid being overcharged.",
    trade: "Auto Mechanic",
    updated: "June 2026",
    readMins: 6,
    body: [
      { type: "p", text: "Few things frustrate a Nigerian car owner more than a mechanic who fixes one thing and 'discovers' three more. A trustworthy mechanic saves you money over years; the wrong one drains it. Here's how to find the right one." },
      { type: "h2", text: "How to spot an honest mechanic" },
      { type: "ul", items: [
        "They diagnose before quoting — not the other way round.",
        "They show you the faulty parts they remove.",
        "They give you options (new vs fairly-used parts) and let you choose.",
        "They don't invent extra faults once your car is on the ramp.",
      ] },
      { type: "h2", text: "Rough costs for common jobs" },
      { type: "price", rows: [
        ["Basic servicing (oil, filters)", "₦15,000 – ₦45,000"],
        ["Brake pads (front set, labour)", "₦8,000 – ₦25,000"],
        ["Diagnostics (scan)", "₦5,000 – ₦15,000"],
        ["Suspension / bushings (per side)", "₦15,000 – ₦60,000"],
        ["AC repair (car)", "₦20,000 – ₦120,000"],
      ] },
      { type: "p", text: "Parts are usually separate and vary by car brand — always confirm whether a quote is labour-only." },
      { type: "tip", text: "For any big repair, get a second opinion. A quick second quote often exposes invented faults and saves you far more than the time it takes." },
      { type: "h2", text: "Find a mechanic near you" },
      { type: "p", text: "Post your car trouble free on NaijaArtisans and get quotes from mechanics near you — with reviews so you can choose someone other drivers already trust." },
    ],
  },
];

export function allGuides() {
  return GUIDES;
}

export function getGuide(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
