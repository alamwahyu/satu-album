import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getGuestSession } from "@/features/guests/session";
import { CameraCapture } from "@/features/camera/camera-capture";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function GuestCameraPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({ where: { slug, deletedAt: null } });
  if (!event || event.disabledAt || event.status === "DISABLED") notFound();

  const session = await getGuestSession(event.id);
  if (!session) redirect(`/e/${event.slug}`);

  const shotsRemaining = Math.max(event.photoLimit - session.guest.photoCount, 0);

  return (
    <CameraCapture
      slug={event.slug}
      eventName={event.name}
      eventDate={event.eventDate.toISOString()}
      guestName={session.guest.name}
      initialShotsRemaining={shotsRemaining}
      photoLimit={event.photoLimit}
    />
  );
}
