import { z } from "zod";

export const joinEventSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  deviceId: z.string().trim().min(16).max(128),
  password: z.string().max(128).optional()
});

export type JoinEventInput = z.infer<typeof joinEventSchema>;
