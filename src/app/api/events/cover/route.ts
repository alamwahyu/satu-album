import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireHost } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";
import { imageProcessor } from "@/lib/image/processor";
import { storageProvider, validateProductionStorageConfig } from "@/lib/storage/storage";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxUploadBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireHost();
    if (!user) return jsonError("Please login to continue.", 401, "UNAUTHORIZED");

    const storageConfig = validateProductionStorageConfig();
    if (!storageConfig.ok) return jsonError(storageConfig.message, 500, "STORAGE_NOT_CONFIGURED");

    const formData = await request.formData();
    const file = formData.get("cover");
    if (!(file instanceof File)) return jsonError("Please select a cover image.", 422, "COVER_REQUIRED");
    if (!allowedTypes.has(file.type)) return jsonError("Only JPEG, PNG, or WebP cover images are supported.", 415, "UNSUPPORTED_IMAGE");
    if (file.size > maxUploadBytes) return jsonError("Cover image must be 10 MB or smaller.", 413, "IMAGE_TOO_LARGE");

    const coverId = `cover_${randomBytes(12).toString("hex")}`;
    const objectKey = `event-covers/${user.id}/${coverId}.jpg`;
    const processed = await imageProcessor.process({
      buffer: Buffer.from(await file.arrayBuffer()),
      maxWidth: 1800,
      quality: 84
    });

    const storage = storageProvider();
    const stored = await storage.put({ key: objectKey, body: processed.image, contentType: "image/jpeg" });

    return NextResponse.json({ objectKey: stored.key, url: stored.url });
  } catch (error) {
    return handleApiError(error);
  }
}
