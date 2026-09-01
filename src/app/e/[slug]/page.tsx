import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Camera, MapPin, Shield } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import { JoinAlbumForm } from "@/features/guests/join-album-form";
import { getGuestSession } from "@/features/guests/session";
import { storageProvider } from "@/lib/storage/storage";
import { appPath } from "@/lib/app-path";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function GuestEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, deletedAt: null },
    include: { _count: { select: { guests: true, photos: true } } }
  });

  if (!event || event.disabledAt || event.status === "DISABLED") notFound();

  const session = await getGuestSession(event.id);
  const isFull = event.guestLimit !== null && event._count.guests >= event.guestLimit && !session;
  const storage = storageProvider();
  const coverUrl = event.coverObjectKey ? storage.getPublicUrl(event.coverObjectKey) : null;
  const theme = {
    background: event.themeBackgroundColor,
    surface: event.themeSurfaceColor,
    accent: event.themeAccentColor
  };

  return (
    <main className="min-h-dvh text-white" style={{ backgroundColor: theme.background }}>
      <section className="mx-auto grid min-h-dvh max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="flex min-h-[52dvh] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-2xl lg:min-h-[86dvh]" style={{ backgroundColor: theme.surface }}>
          <div className="flex items-center justify-between">
            <Link href={appPath("/")} className="text-sm font-semibold text-white/75">
              AWH Album
            </Link>
            <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-stone-950" style={{ backgroundColor: theme.accent }}>
              Private guest link
            </div>
          </div>

          {coverUrl ? (
            <div className="my-10 overflow-hidden rounded-[1.5rem] shadow-inner">
              <img src={coverUrl} alt={`${event.name} cover`} className="aspect-[4/3] w-full object-cover" />
            </div>
          ) : (
            <div className="my-10 aspect-[4/3] rounded-[1.5rem] shadow-inner" style={{ background: `linear-gradient(135deg, ${theme.background}, ${theme.surface} 45%, ${theme.accent})` }} />
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-stone-950" style={{ backgroundColor: theme.accent }}>
                <CalendarDays className="h-4 w-4" />
                {formatDate(event.eventDate)}
              </span>
              {event.venueName ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white/80">
                  <MapPin className="h-4 w-4" />
                  {event.venueName}
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">{event.name}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                {event.description || "Welcome to our disposable camera. Join the album, take your shots, and come back when the memories are revealed."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 text-stone-950 shadow-2xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-500">Disposable camera</p>
              <h2 className="mt-1 text-2xl font-semibold">Join Album</h2>
            </div>
            <Camera className="h-6 w-6 text-stone-400" />
          </div>

          {isFull ? (
            <div className="rounded-lg bg-stone-50 p-4 text-sm text-stone-700">This event has reached its guest limit.</div>
          ) : session ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-stone-50 p-4">
                <p className="font-medium">Welcome back, {session.guest.name}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {Math.max(event.photoLimit - session.guest.photoCount, 0)} shots remaining
                </p>
              </div>
              <Link
                href={appPath(`/e/${event.slug}/camera`)}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-base font-semibold text-stone-950 transition hover:opacity-90"
                style={{ backgroundColor: theme.accent }}
              >
                Open Camera
              </Link>
            </div>
          ) : (
            <JoinAlbumForm
              slug={event.slug}
              requireGuestName={event.requireGuestName}
              hasPassword={Boolean(event.passwordHash)}
              photoLimit={event.photoLimit}
            />
          )}

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-500">
            <Shield className="h-4 w-4 shrink-0" />
            Guests do not need an account. This browser receives a private session token.
          </div>
        </div>
      </section>
    </main>
  );
}
