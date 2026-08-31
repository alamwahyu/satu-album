import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { QrActions } from "@/features/events/qr-actions";
import { appUrl } from "@/lib/app-path";

export default async function EventQrPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, deletedAt: null, ...(user.role === "ADMIN" ? {} : { ownerId: user.id }) }
  });
  if (!event) notFound();

  const guestUrl = appUrl(`/e/${event.slug}`);
  const svg = await QRCode.toString(guestUrl, {
    type: "svg",
    width: 900,
    margin: 2,
    color: event.qrTemplate === "Dark" ? { dark: "#ffffff", light: "#1c1917" } : { dark: "#1c1917", light: "#ffffff" }
  });
  const png = await QRCode.toDataURL(guestUrl, { width: 900, margin: 2 });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Button asChild variant="ghost">
        <Link href={`/dashboard/events/${event.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <div>
        <p className="text-sm font-medium text-stone-500">Guest QR</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">{event.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{event.qrTemplate} template</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="rounded-2xl bg-white p-5 shadow-inner" dangerouslySetInnerHTML={{ __html: svg }} />
          <QrActions eventName={event.name} guestUrl={guestUrl} png={png} svg={svg} />
        </CardContent>
      </Card>
    </div>
  );
}
