import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

export function createGuestToken() {
  return randomBytes(18).toString("base64url");
}

export async function createEventSlug(name: string) {
  const base = slugify(name) || `event-${randomBytes(3).toString("hex")}`;
  let candidate = base;
  let suffix = 2;

  while (await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
