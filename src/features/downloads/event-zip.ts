import JSZip from "jszip";
import type { Photo } from "@prisma/client";
import { storageProvider } from "@/lib/storage/storage";
import { slugify } from "@/features/events/slug";

type ZipPhoto = Pick<Photo, "id" | "processedObjectKey" | "thumbnailObjectKey" | "capturedAt"> & {
  guest: { name: string };
};

export async function createEventZip(eventName: string, photos: ZipPhoto[], options: { byGuest?: boolean } = {}) {
  const zip = new JSZip();
  const storage = storageProvider();
  const rootName = slugify(eventName) || "event";
  const photosFolder = zip.folder("photos");
  const thumbsFolder = zip.folder("thumbnails");
  const byGuestFolder = options.byGuest ? zip.folder("by-guest") : null;

  for (const photo of photos) {
    const timestamp = photo.capturedAt.toISOString().replace(/[:.]/g, "-");
    const guestName = slugify(photo.guest.name) || "guest";
    const filename = `${timestamp}-${guestName}-${photo.id}.jpg`;

    const [image, thumbnail] = await Promise.all([
      storage.get(photo.processedObjectKey),
      photo.thumbnailObjectKey ? storage.get(photo.thumbnailObjectKey) : null
    ]);

    photosFolder?.file(filename, image);
    if (thumbnail) thumbsFolder?.file(filename, thumbnail);
    if (byGuestFolder) byGuestFolder.folder(guestName)?.file(filename, image);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return {
    filename: `${rootName}.zip`,
    buffer
  };
}
