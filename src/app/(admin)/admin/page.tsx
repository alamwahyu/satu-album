import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { formatBytes, formatDate } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/logout-button";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, events, photos, transactions, recentEvents] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.event.count({ where: { deletedAt: null } }),
    prisma.photo.findMany({ where: { status: { not: "DELETED" } }, select: { fileSize: true } }),
    prisma.transaction.findMany({ select: { amountCents: true, status: true } }),
    prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { owner: true, _count: { select: { guests: true, photos: true } } } })
  ]);

  const revenue = transactions.filter((tx) => tx.status === "PAID").reduce((sum, tx) => sum + tx.amountCents, 0);
  const storage = photos.reduce((sum, photo) => sum + (photo.fileSize ?? 0), 0);

  return (
    <div className="min-h-dvh bg-[#f7f4ef]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-stone-950">
            <ShieldCheck className="h-5 w-5" />
            Admin Console
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Host View
              </Link>
            </Button>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm font-medium text-stone-500">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">Application overview</h1>
        </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Users" value={users} />
        <Metric label="Events" value={events} />
        <Metric label="Photos" value={photos.length} />
        <Metric label="Storage" value={formatBytes(storage)} />
        <Metric label="Transactions" value={transactions.length} />
        <Metric label="Revenue" value={`IDR ${(revenue / 100).toLocaleString("id-ID")}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-2">Event</th>
                <th>Owner</th>
                <th>Date</th>
                <th>Status</th>
                <th>Guests</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-t border-stone-100">
                  <td className="py-3 font-medium">{event.name}</td>
                  <td>{event.owner.email}</td>
                  <td>{formatDate(event.eventDate)}</td>
                  <td>{event.status}</td>
                  <td>{event._count.guests}</td>
                  <td>{event._count.photos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-stone-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-stone-950">{value}</p>
      </CardContent>
    </Card>
  );
}
