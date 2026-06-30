// Comprehensive demo data so you can see the whole platform working.
// Idempotent. Run: DATABASE_URL=... npx tsx scripts/seed-demo.ts
import { prisma } from "../src/lib/prisma";

function svg(label: string, sub: string, bg: string): string {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="46%" font-family="sans-serif" font-size="46" font-weight="bold" fill="white" text-anchor="middle">${label}</text><text x="50%" y="58%" font-family="sans-serif" font-size="26" fill="#e5e7eb" text-anchor="middle">${sub}</text></svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(s).toString("base64");
}

async function districtId(en: string): Promise<string | null> {
  const d = await prisma.district.findFirst({
    where: { name: { path: ["en"], equals: en } },
  });
  return d?.id ?? null;
}

async function main() {
  // ---- Programs (3 active + 2 upcoming) ----
  const programs = [
    { en: "Tailoring & Garment Making", kn: "ಹೊಲಿಗೆ ಮತ್ತು ಉಡುಪು ತಯಾರಿಕೆ", status: "active", category: "Apparel", weeks: 8 },
    { en: "Computer & Digital Literacy", kn: "ಕಂಪ್ಯೂಟರ್ ಮತ್ತು ಡಿಜಿಟಲ್ ಸಾಕ್ಷರತೆ", status: "active", category: "IT", weeks: 6 },
    { en: "Electrician & House Wiring", kn: "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಮತ್ತು ಮನೆ ವೈರಿಂಗ್", status: "active", category: "Electrical", weeks: 10 },
    { en: "Mobile Repair Technician", kn: "ಮೊಬೈಲ್ ರಿಪೇರಿ ತಂತ್ರಜ್ಞ", status: "upcoming", category: "Electronics", weeks: 8 },
    { en: "Solar Panel Installation", kn: "ಸೌರ ಫಲಕ ಅಳವಡಿಕೆ", status: "upcoming", category: "Renewable Energy", weeks: 6 },
  ];
  const progId: Record<string, string> = {};
  for (const p of programs) {
    let prog = await prisma.program.findFirst({
      where: { name: { path: ["en"], equals: p.en } },
    });
    if (!prog) {
      prog = await prisma.program.create({
        data: {
          name: { en: p.en, kn: p.kn },
          status: p.status,
          category: p.category,
          durationWeeks: p.weeks,
          description: { en: `${p.weeks}-week hands-on ${p.category.toLowerCase()} training.` },
        },
      });
    }
    progId[p.en] = prog.id;
  }

  // ---- Trainees across districts ----
  const trainees: [string, string][] = [
    ["Anjali", "Mysuru"], ["Ravi Kumar", "Mysuru"], ["Suma", "Bagalkote"],
    ["Manjunath", "Belagavi"], ["Priya", "Bengaluru Urban"], ["Kiran", "Dharwad"],
  ];
  for (const [name, dist] of trainees) {
    const did = await districtId(dist);
    if (!did) continue;
    const exists = await prisma.person.findFirst({
      where: { firstName: name, kind: "TRAINEE", districtId: did },
    });
    if (!exists) {
      await prisma.person.create({
        data: { kind: "TRAINEE", firstName: name, lastName: "(demo)", districtId: did },
      });
    }
  }

  // ---- Applications (various statuses, for admin to review/approve/reject) ----
  const apps: [string, string, "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED", string][] = [
    ["Lakshmi", "Mysuru", "SUBMITTED", "Tailoring & Garment Making"],
    ["Ganesh", "Bagalkote", "SUBMITTED", "Computer & Digital Literacy"],
    ["Nagaraj", "Belagavi", "UNDER_REVIEW", "Electrician & House Wiring"],
    ["Shwetha", "Bengaluru Urban", "SUBMITTED", "Computer & Digital Literacy"],
    ["Imran", "Mysuru", "ACCEPTED", "Tailoring & Garment Making"],
  ];
  let phone = 9800000001;
  for (const [name, dist, status, prog] of apps) {
    const did = await districtId(dist);
    if (!did) continue;
    const exists = await prisma.application.findFirst({
      where: { firstName: name, districtId: did },
    });
    if (!exists) {
      await prisma.application.create({
        data: {
          firstName: name,
          lastName: "(demo)",
          phone: String(phone++),
          districtId: did,
          status,
          programId: progId[prog],
        },
      });
    }
  }

  // ---- Pending posts (so the super admin can practice approving) ----
  const pending: [string, string, string, string][] = [
    ["Mysuru", "New tailoring batch begins", "A fresh batch of 25 trainees started this week. Awaiting approval to publish.", svg("New Batch", "MBV Mysuru", "#0891b2")],
    ["Belagavi", "Community skill fair", "Photos from the weekend community skill fair. Pending review.", svg("Skill Fair", "MBV Belagavi", "#7c3aed")],
  ];
  for (const [dist, title, body, img] of pending) {
    const did = await districtId(dist);
    if (!did) continue;
    const exists = await prisma.post.findFirst({ where: { title, districtId: did } });
    if (!exists) {
      await prisma.post.create({
        data: { title, body, imageUrl: img, approved: false, districtId: did },
      });
    }
  }

  const counts = {
    programs: await prisma.program.count(),
    trainees: await prisma.person.count({ where: { kind: "TRAINEE" } }),
    applications: await prisma.application.count(),
    posts: await prisma.post.count(),
    pendingPosts: await prisma.post.count({ where: { approved: false } }),
  };
  console.log("✅ Demo data ready:", counts);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
