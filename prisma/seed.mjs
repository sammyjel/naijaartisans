import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Broad set of Nigerian artisan / service categories.
// Safe to run anytime: it only upserts categories (no demo data).
const CATEGORIES = [
  // Building & home
  { name: "Plumbing", slug: "plumbing", icon: "🚰" },
  { name: "Electrical", slug: "electrical", icon: "💡" },
  { name: "Carpentry", slug: "carpentry", icon: "🪚" },
  { name: "Bricklaying & Masonry", slug: "masonry", icon: "🧱" },
  { name: "Tiling", slug: "tiling", icon: "🔲" },
  { name: "Painting", slug: "painting", icon: "🎨" },
  { name: "POP & Ceiling", slug: "pop-ceiling", icon: "🏠" },
  { name: "Roofing", slug: "roofing", icon: "🏚️" },
  { name: "Aluminium & Glass Works", slug: "aluminium-glass", icon: "🪟" },
  { name: "Welding & Fabrication", slug: "welding", icon: "🔥" },
  { name: "Interior Decoration", slug: "interior-decor", icon: "🛋️" },
  { name: "Upholstery", slug: "upholstery", icon: "🪑" },
  { name: "Borehole & Drilling", slug: "borehole", icon: "💧" },
  { name: "Solar & Inverter Installation", slug: "solar-inverter", icon: "🔋" },
  { name: "AC & Refrigeration", slug: "ac-refrigeration", icon: "❄️" },
  { name: "Generator Repair", slug: "generator-repair", icon: "⚙️" },

  // Tech & digital
  { name: "IT & Tech Support", slug: "it-support", icon: "💻" },
  { name: "Web & App Development", slug: "web-development", icon: "🖥️" },
  { name: "Graphic Design", slug: "graphic-design", icon: "🖌️" },
  { name: "Digital Marketing & Social Media", slug: "digital-marketing", icon: "📈" },
  { name: "Phone & Computer Repair", slug: "device-repair", icon: "📱" },
  { name: "CCTV & Security Systems", slug: "cctv-security", icon: "📹" },
  { name: "Satellite & DSTV Installation", slug: "satellite-tv", icon: "📡" },
  { name: "Printing & Branding", slug: "printing", icon: "🖨️" },

  // Auto
  { name: "Auto Mechanic", slug: "auto-mechanic", icon: "🔧" },
  { name: "Auto Electrician", slug: "auto-electrician", icon: "🔌" },
  { name: "Panel Beating & Spraying", slug: "panel-beating", icon: "🚗" },
  { name: "Vulcanizer & Tyre Services", slug: "vulcanizer", icon: "🛞" },

  // Fashion & beauty
  { name: "Tailoring & Fashion", slug: "tailoring", icon: "🧵" },
  { name: "Hairdressing & Barbing", slug: "hairdressing", icon: "💈" },
  { name: "Makeup Artist", slug: "makeup", icon: "💄" },
  { name: "Nail Technician", slug: "manicure", icon: "💅" },
  { name: "Spa & Massage", slug: "spa", icon: "💆" },
  { name: "Shoe Making & Repair", slug: "shoe-repair", icon: "👞" },

  // Events & food
  { name: "Catering & Cooking", slug: "catering", icon: "🍲" },
  { name: "Baking & Confectionery", slug: "baking", icon: "🎂" },
  { name: "Event Planning & Rentals", slug: "event-planning", icon: "🎉" },
  { name: "DJ & Sound", slug: "dj-sound", icon: "🎧" },
  { name: "MC & Event Host", slug: "mc-host", icon: "🎤" },
  { name: "Bartending", slug: "bartending", icon: "🍹" },
  { name: "Photography & Video", slug: "photography", icon: "📷" },

  // Home services
  { name: "Cleaning", slug: "cleaning", icon: "🧹" },
  { name: "Laundry & Dry Cleaning", slug: "laundry", icon: "🧺" },
  { name: "Fumigation & Pest Control", slug: "pest-control", icon: "🐜" },
  { name: "Gardening & Landscaping", slug: "landscaping", icon: "🌳" },

  // Logistics & other
  { name: "Dispatch & Logistics", slug: "dispatch", icon: "🏍️" },
  { name: "Haulage & Moving", slug: "moving", icon: "🚚" },
  { name: "Driver / Chauffeur", slug: "driver", icon: "🚙" },
  { name: "Home Tutoring & Lessons", slug: "tutoring", icon: "📚" },
  { name: "Fitness Trainer", slug: "fitness", icon: "🏋️" },
];

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories...`);
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
