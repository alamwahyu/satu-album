import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Camera, Download, Images, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { computeEventStatus } from "@/features/events/status";
import { formatBytes, formatDate } from "@/lib/utils";
import { storageProvider } from "@/lib/storage/storage";
import { appPath, appUrl } from "@/lib/app-path";
import { RevealButton } from "@/features/events/reveal-button";
import { HostPhotoManager, type HostPhoto } from "@/features/events/host-photo-manager";
import { EventAnalyticsPanel, type EventAnalytics } from "@/features/events/event-analytics-panel";
import { DeleteEventButton } from "@/features/events/delete-event-button";

export default async function EventManagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) },
    include: {
      preset: true,
      setting: true,
      guests: { orderBy: { joinedAt: "desc" } },
      photos: { include: { guest: true, preset: true }, orderBy: { uploadedAt: "desc" }, take: 120 },
      _count: { select: { guests: true, photos: true } }
    }
  });
  if (!event) notFound();

  const status = computeEventStatus(event);
  const storage = event.photos.filter((photo) => photo.status !== "DELETED").reduce((sum, photo) => sum + (photo.fileSize ?? 0), 0);
  const guestUrl = appUrl(`/e/${event.slug}`);
  const storageClient = storageProvider();
  const hostPhotos: HostPhoto[] = event.photos.map((photo) => ({
    id: photo.id,
    thumbnailUrl: storageClient.getPublicUrl(photo.thumbnailObjectKey ?? photo.processedObjectKey),
    processedUrl: storageClient.getPublicUrl(photo.processedObjectKey),
    status: photo.status,
    purgedAt: photo.purgedAt,
    isFavorite: photo.isFavorite,
    capturedAt: photo.capturedAt,
    guest: { id: photo.guest.id, name: photo.guest.name },
    preset: photo.preset ? { name: photo.preset.name } : null
  }));
  const analytics = buildAnalytics(event.guests, event.photos.filter((photo) => photo.status !== "DELETED"));

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{event.type}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">{event.name}</h1>
          <p className="mt-3 text-stone-600">{formatDate(event.eventDate)} · {event.venueName ?? "Venue not set"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/dashboard/events/${event.id}/qr`}>QR Code</Link>
          </Button>
          <Button asChild>
            <a href={appPath(`/api/events/${event.id}/download?byGuest=true`)}>
              <Download className="h-4 w-4" />
              Download ZIP
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Calendar} label="Status" value={status} />
        <Metric icon={Users} label="Guests" value={event._count.guests} />
        <Metric icon={Images} label="Photos" value={event._count.photos} />
        <Metric icon={Camera} label="Storage" value={formatBytes(storage)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Event Setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <Info label="Guest URL" value={guestUrl} />
            <Info label="Slug" value={event.slug} />
            <Info label="Photo Limit" value={`${event.photoLimit} shots per guest`} />
            <Info label="Guest Limit" value={event.guestLimit ? `${event.guestLimit} guests` : "Unlimited"} />
            <Info label="Film Preset" value={event.preset?.name ?? "None"} />
            <Info label="Reveal Mode" value={event.revealMode} />
            <Info label="Guest Gallery" value={event.allowGuestGallery ? "Allowed" : "Hidden"} />
            <Info label="Guest Download" value={event.allowGuestDownload ? "Allowed" : "Disabled"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Controls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <RevealButton eventId={event.id} disabled={status === "REVEALED"} />
            <Button asChild variant="secondary">
              <Link href={`/dashboard/events/${event.id}/settings`}>
                <Settings className="h-4 w-4" />
                Event Settings
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a href={`/e/${event.slug}/gallery`} target="_blank" rel="noreferrer">
                <Images className="h-4 w-4" />
                View Gallery
              </a>
            </Button>
            <DeleteEventButton eventId={event.id} eventName={event.name} />
            <p className="text-sm leading-6 text-stone-500">
              Reveal, guest gallery, moderation, analytics, and ZIP export are active.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <EventAnalyticsPanel analytics={analytics} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle>Guests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between rounded-lg bg-stone-50 p-3 text-sm">
                <div>
                  <p className="font-medium">{guest.name}</p>
                  <p className="text-xs text-stone-500">Joined {formatDate(guest.joinedAt)} · Last active {formatDate(guest.lastActiveAt)}</p>
                </div>
                <span className="shrink-0 text-stone-500">{guest.photoCount} photos</span>
              </div>
            ))}
            {event.guests.length === 0 ? <p className="text-sm text-stone-500">No guests yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photo Moderation</CardTitle>
          </CardHeader>
          <CardContent>
            {event.photos.length === 0 ? (
              <p className="text-sm text-stone-500">No photos yet.</p>
            ) : (
              <HostPhotoManager photos={hostPhotos} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function buildAnalytics(
  guests: { id: string; name: string; photoCount: number }[],
  photos: { capturedAt: Date; fileSize: number | null }[]
): EventAnalytics {
  const photosByHour = new Map<string, number>();
  for (const photo of photos) {
    const hour = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(photo.capturedAt).replace(/:\d\d$/, ":00");
    photosByHour.set(hour, (photosByHour.get(hour) ?? 0) + 1);
  }
  const mostActiveGuest = [...guests].sort((a, b) => b.photoCount - a.photoCount)[0] ?? null;
  const peak = [...photosByHour.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    guestsJoined: guests.length,
    photosCaptured: photos.length,
    averagePhotosPerGuest: guests.length ? photos.length / guests.length : 0,
    mostActiveGuest: mostActiveGuest ? { id: mostActiveGuest.id, name: mostActiveGuest.name, photos: mostActiveGuest.photoCount } : null,
    peakCaptureTime: peak ? { hour: peak[0], photos: peak[1] } : null,
    storageUsed: photos.reduce((sum, photo) => sum + (photo.fileSize ?? 0), 0),
    photosByHour: [...photosByHour.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count }))
  };
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-stone-400" />
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <p className="text-stone-500">{label}</p>
      <p className="mt-1 break-words font-medium text-stone-950">{value}</p>
    </div>
  );
}
