import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { CreateEventForm } from "@/features/events/create-event-form";

export default async function NewEventPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const presets = await prisma.filmPreset.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-sm font-medium text-stone-500">Create event</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950 md:text-5xl">Set up a disposable camera album</h1>
      </div>
      <CreateEventForm presets={presets.map((preset) => ({ id: preset.id, name: preset.name }))} />
    </div>
  );
}
