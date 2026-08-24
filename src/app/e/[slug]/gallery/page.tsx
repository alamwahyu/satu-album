import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { isAlbumRevealed } from "@/features/events/status";
import { storageProvider } from "@/lib/storage/storage";
import { GuestGallery, type GalleryPhoto } from "@/features/gallery/guest-gallery";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function GuestGalleryPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, deletedAt: null },
    include: {
      photos: {
        where: { status: "ACTIVE" },
        include: { guest: { select: { name: true } }, preset: { select: { name: true } } },
        orderBy: { capturedAt: "desc" },
        take: 100
      }
    }
  });
  if (!event || event.disabledAt || event.status === "DISABLED") notFound();

  const revealed = isAlbumRevealed(event);
  const storage = storageProvider();
  const photos: GalleryPhoto[] = event.photos.map((photo) => ({
    id: photo.id,
    thumbnailUrl: photo.thumbnailObjectKey ? storage.getPublicUrl(photo.thumbnailObjectKey) : storage.getPublicUrl(photo.processedObjectKey),
    processedUrl: storage.getPublicUrl(photo.processedObjectKey),
    capturedBy: photo.guest.name,
    capturedAt: photo.capturedAt,
    presetName: photo.preset?.name ?? null,
    width: photo.width,
    height: photo.height,
    allowDownload: event.allowGuestDownload
  }));

  return (
    <main className="min-h-dvh bg-[#f7f4ef] px-5 py-8">
      <section className="mx-auto max-w-5xl">
        <Link href={`/e/${event.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600">
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
        <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-stone-500">{event.name}</p>
          {!event.allowGuestGallery ? (
            <div className="py-10 text-center">
              <h1 className="text-3xl font-semibold text-stone-950">Gallery is not available</h1>
              <p className="mx-auto mt-3 max-w-md text-stone-600">The host has disabled guest gallery access for this event.</p>
            </div>
          ) : revealed ? (
            <>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="mt-2 text-4xl font-semibold text-stone-950">Gallery</h1>
                  <p className="mt-3 text-stone-600">{photos.length} photos revealed</p>
                </div>
                <Link href={`/e/${event.slug}/camera`} className="text-sm font-semibold text-stone-950">
                  Back to camera
                </Link>
              </div>
              {photos.length > 0 ? (
                <GuestGallery photos={photos} />
              ) : (
                <div className="rounded-lg bg-stone-50 p-8 text-center text-stone-600">No photos have been captured yet.</div>
              )}
            </>
          ) : (
            <div className="py-10 text-center">
              <div className="mx-auto mb-6 h-24 w-16 animate-pulse rounded-lg bg-stone-950" />
              <h1 className="text-3xl font-semibold text-stone-950">Your photos are developing...</h1>
              <p className="mx-auto mt-3 max-w-md text-stone-600">Come back later to see the full album after the host reveals it.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
