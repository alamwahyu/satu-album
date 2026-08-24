import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { CreateEventForm } from "@/features/events/create-event-form";

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeInput(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : undefined;
}

function dateTimeInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 16) : undefined;
}

export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [event, presets] = await Promise.all([
    prisma.event.findFirst({
      where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }
    }),
    prisma.filmPreset.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Button asChild variant="ghost">
        <Link href={`/dashboard/events/${event.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <div>
        <p className="text-sm font-medium text-stone-500">Event settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">{event.name}</h1>
      </div>
      <CreateEventForm
        presets={presets.map((preset) => ({ id: preset.id, name: preset.name }))}
        initialEvent={{
          id: event.id,
          name: event.name,
          type: event.type,
          eventDate: dateInput(event.eventDate),
          startTime: timeInput(event.startAt),
          endTime: timeInput(event.endAt),
          timezone: event.timezone,
          venueName: event.venueName,
          description: event.description,
          guestLimit: event.guestLimit,
          photoLimit: event.photoLimit,
          presetId: event.presetId,
          revealMode: event.revealMode,
          revealAt: dateTimeInput(event.revealAt),
          allowGuestDownload: event.allowGuestDownload,
          allowGuestGallery: event.allowGuestGallery,
          requireGuestName: event.requireGuestName,
          privacy: event.privacy,
          qrTemplate: event.qrTemplate
        }}
      />
    </div>
  );
}
