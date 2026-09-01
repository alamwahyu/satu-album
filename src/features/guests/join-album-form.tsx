"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appPath } from "@/lib/app-path";
import { Label } from "@/components/ui/label";

function ensureDeviceId() {
  const key = "luma_guest_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, value);
  return value;
}

export function JoinAlbumForm({
  slug,
  requireGuestName,
  hasPassword,
  photoLimit
}: {
  slug: string;
  requireGuestName: boolean;
  hasPassword: boolean;
  photoLimit: number;
}) {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDeviceId(ensureDeviceId());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch(appPath(`/api/guest/events/${slug}/join`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name") || undefined,
        password: form.get("password") || undefined,
        deviceId
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? "Unable to join this album.");
      setLoading(false);
      return;
    }

    router.push(`/e/${slug}/camera`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg bg-stone-50 p-4">
        <p className="text-sm text-stone-500">Shots per guest</p>
        <p className="mt-1 text-3xl font-semibold">{photoLimit}</p>
      </div>

      {requireGuestName ? (
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input id="name" name="name" autoComplete="name" required placeholder="Alam" />
        </div>
      ) : null}

      {hasPassword ? (
        <div className="space-y-2">
          <Label htmlFor="password">Event Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <Button className="h-12 w-full text-base" disabled={loading || !deviceId}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continue
      </Button>
    </form>
  );
}
