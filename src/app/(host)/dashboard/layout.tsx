import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Camera, LayoutDashboard, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-[#f7f4ef]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-stone-950">
            <Camera className="h-5 w-5" />
            Luma Album
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/events/new">
                <Plus className="h-4 w-4" />
                Create Event
              </Link>
            </Button>
            {user.role === "ADMIN" ? (
              <Button asChild variant="ghost">
                <Link href="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Console
                </Link>
              </Button>
            ) : null}
            <LogoutButton />
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            {user.role === "ADMIN" ? (
              <Button asChild variant="secondary" size="icon">
                <Link href="/admin" aria-label="Admin console">
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary" size="icon">
              <Link href="/dashboard/events/new" aria-label="Create event">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <LogoutButton compact />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      <footer className="mx-auto flex max-w-7xl items-center gap-2 px-5 pb-8 text-sm text-stone-500">
        <CalendarDays className="h-4 w-4" />
        Phase 2 foundation. Camera capture, uploads, reveal, and gallery grid are prepared next.
      </footer>
    </div>
  );
}
