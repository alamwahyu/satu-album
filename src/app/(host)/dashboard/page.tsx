import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Copy, Images, Plus, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { computeEventStatus } from "@/features/events/status";
import { formatBytes, formatDate } from "@/lib/utils";
import { EventFilters } from "@/features/events/event-filters";

const filters = ["All", "Draft", "Upcoming", "Active", "Completed", "Archived"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { status } = await searchParams;
  const selected = status?.toUpperCase();

  const events = await prisma.event.findMany({
    where: user.role === "ADMIN" ? { deletedAt: null } : { ownerId: user.id, deletedAt: null },
    include: {
      _count: { select: { guests: true, photos: true } },
      photos: { where: { status: { not: "DELETED" } }, select: { fileSize: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const viewEvents = events
    .map((event) => ({ ...event, computedStatus: computeEventStatus(event) }))
    .filter((event) => !selected || selected === "ALL" || event.computedStatus === selected);

  const totalGuests = events.reduce((sum, event) => sum + event._count.guests, 0);
  const totalPhotos = events.reduce((sum, event) => sum + event._count.photos, 0);
  const totalStorage = events.flatMap((event) => event.photos).reduce((sum, photo) => sum + (photo.fileSize ?? 0), 0);
  const activeEvents = events.map((event) => computeEventStatus(event)).filter((eventStatus) => eventStatus === "ACTIVE" || eventStatus === "REVEALED").length;
  const completedEvents = events.map((event) => computeEventStatus(event)).filter((eventStatus) => eventStatus === "COMPLETED").length;
  const upcomingEvents = events.map((event) => computeEventStatus(event)).filter((eventStatus) => eventStatus === "UPCOMING").length;

  const stats = [
    { label: "Total Events", value: events.length, icon: Calendar },
    { label: "Total Guests", value: totalGuests, icon: Users },
    { label: "Total Photos", value: totalPhotos, icon: Images },
    { label: "Storage Used", value: formatBytes(totalStorage), icon: QrCode },
    { label: "Upcoming Events", value: upcomingEvents, icon: Calendar },
    { label: "Active Events", value: activeEvents, icon: CameraIcon },
    { label: "Completed Events", value: completedEvents, icon: Images }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">Host dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">Your event albums</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-stone-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-stone-950">{stat.value}</p>
              </div>
              <stat.icon className="h-5 w-5 text-stone-400" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <EventFilters filters={filters} selected={status ?? "All"} />
        <div className="grid gap-4 lg:grid-cols-2">
          {viewEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{event.name}</CardTitle>
                  <p className="mt-2 text-sm text-stone-500">{formatDate(event.eventDate)}</p>
                </div>
                <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">{event.computedStatus}</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-stone-50 p-3">
                    <p className="text-stone-500">Guests</p>
                    <p className="mt-1 text-xl font-semibold">{event._count.guests}</p>
                  </div>
                  <div className="rounded-lg bg-stone-50 p-3">
                    <p className="text-stone-500">Photos</p>
                    <p className="mt-1 text-xl font-semibold">{event._count.photos}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/events/${event.id}`}>Manage Event</Link>
                  </Button>
                  <Button asChild variant="secondary" className="flex-1">
                    <Link href={`/dashboard/events/${event.id}/qr`}>
                      <QrCode className="h-4 w-4" />
                      QR
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 flex items-center gap-2 truncate text-sm text-stone-500">
                  <Copy className="h-4 w-4 shrink-0" />
                  /e/{event.slug}
                </p>
              </CardContent>
            </Card>
          ))}
          {viewEvents.length === 0 ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center">
                <p className="text-stone-600">No events match this filter.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return <QrCode {...props} />;
}
