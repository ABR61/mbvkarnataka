// Dev demo: seed a few "activity report" posts (photo + description) across
// districts so the /reports gallery and home news look populated.
// Images are self-contained SVG data URLs (no internet needed).
// Run: DATABASE_URL=... npx tsx scripts/seed-activity-reports.ts
import { prisma } from "../src/lib/prisma";

function svg(label: string, sub: string, bg: string): string {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#0f766e"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="46%" font-family="sans-serif" font-size="46" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
    <text x="50%" y="58%" font-family="sans-serif" font-size="26" fill="#d1fae5" text-anchor="middle">${sub}</text>
  </svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(s).toString("base64");
}

const ACTIVITIES = [
  {
    district: "Bagalkote",
    title: "Tailoring & stitching workshop",
    body: "30 women completed a 6-week tailoring workshop and received starter sewing kits to begin earning from home.",
    img: svg("Tailoring Workshop", "MBV Bagalkote", "#059669"),
  },
  {
    district: "Mysuru",
    title: "Computer basics training batch",
    body: "A new batch of 25 youth began hands-on computer and digital-literacy training at the Mysuru centre.",
    img: svg("Computer Training", "MBV Mysuru", "#0891b2"),
  },
  {
    district: "Belagavi",
    title: "Health & hygiene awareness camp",
    body: "Volunteers conducted a community health and hygiene awareness camp reaching over 200 families.",
    img: svg("Health Camp", "MBV Belagavi", "#16a34a"),
  },
  {
    district: "Bengaluru Urban",
    title: "Job placement drive",
    body: "12 trainees were placed with local employers during the monthly placement drive in Bengaluru.",
    img: svg("Placement Drive", "MBV Bengaluru", "#2563eb"),
  },
  {
    district: "Dharwad",
    title: "Beautician course graduation",
    body: "18 trainees graduated from the beautician and wellness course and received their certificates.",
    img: svg("Beautician Course", "MBV Dharwad", "#7c3aed"),
  },
  {
    district: "Kalaburagi",
    title: "Electrician skills training",
    body: "Practical electrician and wiring training underway, preparing youth for ITI-level employment.",
    img: svg("Electrician Training", "MBV Kalaburagi", "#d97706"),
  },
];

async function main() {
  let made = 0;
  for (let i = 0; i < ACTIVITIES.length; i++) {
    const a = ACTIVITIES[i];
    const d = await prisma.district.findFirst({
      where: { name: { path: ["en"], equals: a.district } },
    });
    if (!d) {
      console.log(`skip ${a.district} (not found)`);
      continue;
    }
    const exists = await prisma.post.findFirst({
      where: { title: a.title, districtId: d.id },
    });
    if (exists) continue;
    await prisma.post.create({
      data: {
        title: a.title,
        body: a.body,
        imageUrl: a.img,
        districtId: d.id,
        createdAt: new Date(Date.now() - i * 86_400_000),
      },
    });
    made++;
  }
  console.log(`✅ Seeded ${made} activity reports.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
