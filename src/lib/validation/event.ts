import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["WEDDING", "ENGAGEMENT", "BIRTHDAY", "CORPORATE", "PARTY", "REUNION", "OTHER"]),
  eventDate: z.string().date(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().min(2).default("Asia/Jakarta"),
  venueName: z.string().max(140).optional(),
  coverObjectKey: z.string().optional(),
  description: z.string().max(1200).optional(),
  guestLimit: z.coerce.number().int().positive().max(10000).optional(),
  photoLimit: z.coerce.number().int().min(1).max(500).default(24),
  presetId: z.string().optional(),
  revealMode: z.enum(["LIVE", "AFTER_EVENT", "CUSTOM", "MANUAL"]).default("AFTER_EVENT"),
  revealAt: z.string().datetime().optional(),
  allowGuestDownload: z.coerce.boolean().default(false),
  allowGuestGallery: z.coerce.boolean().default(true),
  requireGuestName: z.coerce.boolean().default(true),
  privacy: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
  eventPassword: z.string().min(4).max(128).optional(),
  qrTemplate: z.enum(["Minimal", "Wedding", "Dark", "Elegant", "Classic"]).default("Minimal")
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
