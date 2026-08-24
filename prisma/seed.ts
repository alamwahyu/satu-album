import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { filmPresets } from "../src/features/presets/preset-config";
import { createEventSlug, createGuestToken } from "../src/features/events/slug";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { code: "FREE", name: "Free", priceCents: 0, guestLimit: 5, photoLimitPerGuest: 20, storageLimitMb: 250 },
    { code: "BASIC", name: "Basic", priceCents: 99000, guestLimit: 50, photoLimitPerGuest: 24, storageLimitMb: 2048 },
    { code: "PRO", name: "Pro", priceCents: 249000, guestLimit: 100, photoLimitPerGuest: 36, storageLimitMb: 8192 },
    { code: "PREMIUM", name: "Premium", priceCents: 499000, guestLimit: 250, photoLimitPerGuest: 60, storageLimitMb: 25600 }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }

  for (const preset of filmPresets) {
    await prisma.filmPreset.upsert({
      where: { slug: preset.slug },
      update: { name: preset.name, description: preset.description, config: preset.config },
      create: preset
    });
  }

  const passwordHash = await bcrypt.hash("Password123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@luma.test" },
    update: { passwordHash, role: "ADMIN", name: "Admin" },
    create: { email: "admin@luma.test", passwordHash, role: "ADMIN", name: "Admin" }
  });

  const host = await prisma.user.upsert({
    where: { email: "host@luma.test" },
    update: { passwordHash, role: "HOST", name: "Demo Host" },
    create: { email: "host@luma.test", passwordHash, role: "HOST", name: "Demo Host" }
  });

  const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "BASIC" } });
  const warmPreset = await prisma.filmPreset.findUniqueOrThrow({ where: { slug: "classic-warm" } });
  const slug = await createEventSlug("Alam & Ghina Wedding");

  await prisma.event.upsert({
    where: { slug },
    update: {},
    create: {
      ownerId: host.id,
      planId: basicPlan.id,
      presetId: warmPreset.id,
      name: "Alam & Ghina Wedding",
      slug,
      guestToken: createGuestToken(),
      type: "WEDDING",
      eventDate: new Date("2026-08-24T00:00:00.000Z"),
      startAt: new Date("2026-08-24T10:00:00.000Z"),
      endAt: new Date("2026-08-24T16:00:00.000Z"),
      timezone: "Asia/Jakarta",
      venueName: "Jakarta",
      description: "Demo event untuk menguji shared disposable camera album.",
      guestLimit: 50,
      photoLimit: 24,
      revealMode: "MANUAL",
      status: "UPCOMING",
      setting: { create: {} }
    }
  });

  console.log({ admin: admin.email, host: host.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
