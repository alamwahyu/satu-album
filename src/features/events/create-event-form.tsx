"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Preset = { id: string; name: string };
type EventFormInitial = {
  id: string;
  name: string;
  type: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  venueName?: string | null;
  coverObjectKey?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  guestLimit?: number | null;
  photoLimit: number;
  presetId?: string | null;
  revealMode: string;
  revealAt?: string | null;
  allowGuestDownload: boolean;
  allowGuestGallery: boolean;
  requireGuestName: boolean;
  privacy: string;
  qrTemplate: string;
};

export function CreateEventForm({ presets, initialEvent }: { presets: Preset[]; initialEvent?: EventFormInitial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverObjectKey, setCoverObjectKey] = useState(initialEvent?.coverObjectKey ?? "");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(initialEvent?.coverUrl ?? "");
  const isEdit = Boolean(initialEvent);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let uploadedCoverObjectKey = coverObjectKey;

    if (coverFile) {
      const coverForm = new FormData();
      coverForm.append("cover", coverFile);
      const coverResponse = await fetch("/api/events/cover", {
        method: "POST",
        body: coverForm
      });

      if (!coverResponse.ok) {
        const data = await coverResponse.json().catch(() => null);
        setError(data?.error?.message ?? "Unable to upload cover photo.");
        setLoading(false);
        return;
      }

      const data = await coverResponse.json();
      uploadedCoverObjectKey = data.objectKey;
      setCoverObjectKey(data.objectKey);
      setCoverPreviewUrl(data.url);
    }

    const payload = {
      name: form.get("name"),
      type: form.get("type"),
      eventDate: form.get("eventDate"),
      startTime: form.get("startTime") || undefined,
      endTime: form.get("endTime") || undefined,
      timezone: form.get("timezone"),
      venueName: form.get("venueName") || undefined,
      coverObjectKey: uploadedCoverObjectKey || undefined,
      description: form.get("description") || undefined,
      guestLimit: form.get("guestLimit") || undefined,
      photoLimit: form.get("photoLimit") || 24,
      presetId: form.get("presetId") || undefined,
      revealMode: form.get("revealMode"),
      revealAt: form.get("revealAt") ? new Date(String(form.get("revealAt"))).toISOString() : undefined,
      allowGuestDownload: form.get("allowGuestDownload") === "on",
      allowGuestGallery: form.get("allowGuestGallery") === "on",
      requireGuestName: form.get("requireGuestName") === "on",
      privacy: form.get("privacy"),
      eventPassword: form.get("eventPassword") || undefined,
      qrTemplate: form.get("qrTemplate")
    };

    const response = await fetch(isEdit ? `/api/events/${initialEvent?.id}` : "/api/events", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? (isEdit ? "Unable to update event." : "Unable to create event."));
      setLoading(false);
      return;
    }

    router.push(isEdit ? `/dashboard/events/${initialEvent?.id}` : "/dashboard");
    router.refresh();
  }

  function onCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) setCoverPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Event Name" name="name" required placeholder="Ghina & Alam Wedding" defaultValue={initialEvent?.name} />
            <Select label="Event Type" name="type" options={["WEDDING", "ENGAGEMENT", "BIRTHDAY", "CORPORATE", "PARTY", "REUNION", "OTHER"]} defaultValue={initialEvent?.type} />
            <Field label="Event Date" name="eventDate" type="date" required defaultValue={initialEvent?.eventDate} />
            <Field label="Timezone" name="timezone" defaultValue={initialEvent?.timezone ?? "Asia/Jakarta"} required />
            <Field label="Start Time" name="startTime" type="time" defaultValue={initialEvent?.startTime} />
            <Field label="End Time" name="endTime" type="time" defaultValue={initialEvent?.endTime} />
            <Field label="Venue Name" name="venueName" placeholder="Venue or city" defaultValue={initialEvent?.venueName ?? undefined} />
            <Field label="Guest Limit" name="guestLimit" type="number" min="1" placeholder="100" defaultValue={initialEvent?.guestLimit ?? undefined} />
            <Field label="Photo Limit Per Guest" name="photoLimit" type="number" min="1" defaultValue={initialEvent?.photoLimit ?? 24} required />
            <Select label="Reveal Mode" name="revealMode" options={["LIVE", "AFTER_EVENT", "CUSTOM", "MANUAL"]} defaultValue={initialEvent?.revealMode} />
            <Field label="Reveal At" name="revealAt" type="datetime-local" defaultValue={initialEvent?.revealAt ?? undefined} />
            <Select label="Privacy" name="privacy" options={["PRIVATE", "PUBLIC"]} defaultValue={initialEvent?.privacy} />
            <Select label="QR Template" name="qrTemplate" options={["Minimal", "Wedding", "Dark", "Elegant", "Classic"]} defaultValue={initialEvent?.qrTemplate} />
            <div className="space-y-2">
              <Label htmlFor="presetId">Film Preset</Label>
              <select id="presetId" name="presetId" defaultValue={initialEvent?.presetId ?? ""} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm shadow-sm">
                <option value="">No preset</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Event Password" name="eventPassword" type="password" placeholder={isEdit ? "Leave blank to keep current password" : "Optional"} />
          </div>

          <div className="space-y-3">
            <Label htmlFor="coverPhoto">Cover Photo</Label>
            {coverPreviewUrl ? (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                <img src={coverPreviewUrl} alt="Event cover preview" className="aspect-[4/3] w-full object-cover" />
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                No cover selected
              </div>
            )}
            <Input id="coverPhoto" name="coverPhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={onCoverChange} />
            <p className="text-xs text-stone-500">JPEG, PNG, or WebP. Max 10 MB.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Event Description</Label>
            <Textarea id="description" name="description" placeholder="A short welcome message for guests." defaultValue={initialEvent?.description ?? undefined} />
          </div>

          <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 md:grid-cols-3">
            <Checkbox label="Allow Guest Download" name="allowGuestDownload" defaultChecked={initialEvent?.allowGuestDownload ?? false} />
            <Checkbox label="Allow Guest Gallery" name="allowGuestGallery" defaultChecked={initialEvent?.allowGuestGallery ?? true} />
            <Checkbox label="Require Guest Name" name="requireGuestName" defaultChecked={initialEvent?.requireGuestName ?? true} />
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button size="lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save Settings" : "Create Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue} className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm shadow-sm">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-stone-300" />
      {label}
    </label>
  );
}
