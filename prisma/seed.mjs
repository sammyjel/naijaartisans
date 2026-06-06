import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Plumbing", slug: "plumbing", icon: "🚰" },
  { name: "Electrical", slug: "electrical", icon: "💡" },
  { name: "Carpentry", slug: "carpentry", icon: "🪚" },
  { name: "Tailoring & Fashion", slug: "tailoring", icon: "🧵" },
  { name: "Hairdressing & Barbing", slug: "hairdressing", icon: "💈" },
  { name: "Catering & Cooking", slug: "catering", icon: "🍲" },
  { name: "Cleaning", slug: "cleaning", icon: "🧹" },
  { name: "Painting", slug: "painting", icon: "🎨" },
  { name: "AC & Refrigeration", slug: "ac-refrigeration", icon: "❄️" },
  { name: "Auto Mechanic", slug: "auto-mechanic", icon: "🔧" },
  { name: "Bricklaying & Masonry", slug: "masonry", icon: "🧱" },
  { name: "Welding & Fabrication", slug: "welding", icon: "🔥" },
  { name: "Photography & Video", slug: "photography", icon: "📷" },
  { name: "Tiling", slug: "tiling", icon: "🔲" },
  { name: "Generator Repair", slug: "generator-repair", icon: "⚙️" },
  { name: "Phone & Computer Repair", slug: "device-repair", icon: "📱" },
];

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Benin City", "Enugu"];

async function main() {
  console.log("Seeding database...");

  // Categories
  const categories = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon },
      create: c,
    });
    categories[c.slug] = cat;
  }
  console.log(`Seeded ${Object.keys(categories).length} categories.`);

  const passwordHash = await bcrypt.hash("password123", 10);

  // A demo customer
  const customer = await prisma.user.upsert({
    where: { email: "customer@demo.com" },
    update: {},
    create: {
      name: "Chidi Okafor",
      email: "customer@demo.com",
      phone: "08030000001",
      password: passwordHash,
      role: "CUSTOMER",
      city: "Lagos",
      bio: "Looking for reliable hands around Lagos.",
    },
  });

  // Demo artisans, each with a service
  const artisanSeeds = [
    {
      name: "Musa Ibrahim", email: "musa@demo.com", phone: "08030000002", city: "Lagos",
      bio: "Licensed plumber with 8 years experience. Fast and neat.",
      slug: "plumbing", title: "Expert Plumbing & Pipe Repairs",
      description: "Leak fixing, pipe installation, water heater setup, borehole connections. Same-day service across Lagos mainland and island.",
      priceMin: 5000, priceMax: 50000,
    },
    {
      name: "Blessing Eze", email: "blessing@demo.com", phone: "08030000003", city: "Abuja",
      bio: "Professional fashion designer and tailor.",
      slug: "tailoring", title: "Custom Native & English Wears",
      description: "Agbada, kaftan, gowns, suits and Ankara styles. Quality stitching with quick turnaround for events.",
      priceMin: 8000, priceMax: 80000,
    },
    {
      name: "Emeka Nwosu", email: "emeka@demo.com", phone: "08030000004", city: "Lagos",
      bio: "Certified electrician. Safety first.",
      slug: "electrical", title: "Home & Office Electrical Wiring",
      description: "Full house wiring, socket and switch installation, fault tracing, inverter and solar setup. NEMSA-compliant work.",
      priceMin: 7000, priceMax: 150000,
    },
    {
      name: "Aisha Bello", email: "aisha@demo.com", phone: "08030000005", city: "Kano",
      bio: "Caterer for parties and small chops.",
      slug: "catering", title: "Party Catering & Small Chops",
      description: "Jollof rice, fried rice, pepper soup, small chops and event catering for 20 to 500 guests.",
      priceMin: 30000, priceMax: 500000,
    },
    {
      name: "Tunde Adeyemi", email: "tunde@demo.com", phone: "08030000006", city: "Ibadan",
      bio: "AC and fridge technician.",
      slug: "ac-refrigeration", title: "AC Installation, Servicing & Gas Refill",
      description: "Split and window AC installation, servicing, gas refill, freezer and fridge repair. Warranty on all jobs.",
      priceMin: 6000, priceMax: 60000,
    },
    {
      name: "Grace Effiong", email: "grace@demo.com", phone: "08030000007", city: "Port Harcourt",
      bio: "Mobile hairstylist and braider.",
      slug: "hairdressing", title: "Braids, Weaves & Bridal Styling",
      description: "Box braids, knotless braids, weaving, gel styling and bridal hair. Home service available in PH.",
      priceMin: 4000, priceMax: 40000,
    },
    {
      name: "Yusuf Sani", email: "yusuf@demo.com", phone: "08030000008", city: "Abuja",
      bio: "Generator repair and maintenance specialist.",
      slug: "generator-repair", title: "Generator Repair & Servicing",
      description: "Repair and servicing of all generator brands - Mikano, Elepaq, Tiger, Lutian. Carburetor, AVR and engine work.",
      priceMin: 5000, priceMax: 70000,
    },
    {
      name: "John Okon", email: "john@demo.com", phone: "08030000009", city: "Lagos",
      bio: "Carpenter and furniture maker.",
      slug: "carpentry", title: "Furniture, Wardrobes & TV Stands",
      description: "Custom wardrobes, kitchen cabinets, TV consoles, bed frames and office furniture. Built to last.",
      priceMin: 20000, priceMax: 400000,
    },
  ];

  let serviceCount = 0;
  const artisans = [];
  for (const a of artisanSeeds) {
    const artisan = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        name: a.name,
        email: a.email,
        phone: a.phone,
        password: passwordHash,
        role: "ARTISAN",
        city: a.city,
        bio: a.bio,
      },
    });
    artisans.push(artisan);

    // Only create a service if this artisan has none yet (keeps re-seeding idempotent-ish)
    const existing = await prisma.service.findFirst({ where: { artisanId: artisan.id } });
    if (!existing) {
      await prisma.service.create({
        data: {
          title: a.title,
          description: a.description,
          priceMin: a.priceMin,
          priceMax: a.priceMax,
          city: a.city,
          artisanId: artisan.id,
          categoryId: categories[a.slug].id,
        },
      });
      serviceCount++;
    }
  }
  console.log(`Seeded ${artisans.length} artisans and ${serviceCount} services.`);

  // A couple of reviews for the first artisan
  const firstArtisan = artisans[0];
  const existingReview = await prisma.review.findFirst({ where: { targetId: firstArtisan.id } });
  if (!existingReview) {
    await prisma.review.create({
      data: { rating: 5, comment: "Very professional, fixed my leaking pipe fast!", authorId: customer.id, targetId: firstArtisan.id },
    });
  }

  // A sample open job request
  const existingJob = await prisma.jobRequest.findFirst({ where: { customerId: customer.id } });
  if (!existingJob) {
    await prisma.jobRequest.create({
      data: {
        title: "Need a plumber to fix kitchen sink",
        description: "My kitchen sink is leaking under the cabinet. Need someone today or tomorrow in Yaba, Lagos.",
        city: "Lagos",
        budget: 15000,
        customerId: customer.id,
        categoryId: categories["plumbing"].id,
      },
    });
  }

  console.log("\nDone! Demo logins (password for all: password123):");
  console.log("  Customer: customer@demo.com");
  console.log("  Artisan:  musa@demo.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
