"use client";

import { useState } from "react";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type GalleryPhoto = {
  id: string;
  thumbnailUrl: string;
  processedUrl: string;
  capturedBy: string;
  capturedAt: string | Date;
  presetName: string | null;
  width: number | null;
  height: number | null;
  allowDownload: boolean;
};

export function GuestGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [guestName, setGuestName] = useState("");
  const normalizedGuestName = guestName.trim().toLowerCase();
  const guestNames = Array.from(new Set(photos.map((photo) => photo.capturedBy))).sort((a, b) => a.localeCompare(b));
  const filteredPhotos = normalizedGuestName
    ? photos.filter((photo) => photo.capturedBy.toLowerCase().includes(normalizedGuestName))
    : photos;
  const selectedOrientation = selected ? getPhotoOrientation(selected) : null;

  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Filter by guest name"
            className="pr-10 pl-9"
          />
          {guestName ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-950"
              onClick={() => setGuestName("")}
              aria-label="Clear guest name filter"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {guestNames.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                !guestName ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-600"
              }`}
              onClick={() => setGuestName("")}
            >
              All
            </button>
            {guestNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  guestName === name ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-600"
                }`}
                onClick={() => setGuestName(name)}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-stone-500">
          Showing {filteredPhotos.length} of {photos.length} photos
        </p>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="rounded-lg bg-stone-50 p-8 text-center text-stone-600">No photos found for this guest name.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
          {filteredPhotos.map((photo) => (
            <button
              key={photo.id}
              className="group block aspect-square w-full overflow-hidden rounded-lg bg-stone-100 text-left shadow-sm transition hover:opacity-90"
              onClick={() => setSelected(photo)}
            >
              <img
                src={photo.thumbnailUrl}
                alt={`Captured by ${photo.capturedBy}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 grid bg-black/88 p-4 text-white backdrop-blur-sm md:place-items-center">
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col md:h-auto">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Captured by {selected.capturedBy}</p>
                <p className="text-sm text-white/60">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.capturedAt))}
                  {selectedOrientation ? ` · ${selectedOrientation}` : ""}
                  {selected.presetName ? ` · ${selected.presetName}` : ""}
                </p>
              </div>
              <Button variant="secondary" size="icon" onClick={() => setSelected(null)} aria-label="Close lightbox">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid flex-1 place-items-center overflow-hidden rounded-lg bg-black">
              <img src={selected.processedUrl} alt={`Captured by ${selected.capturedBy}`} className="max-h-[76dvh] w-auto max-w-full object-contain" />
            </div>
            {selected.allowDownload ? (
              <a
                href={selected.processedUrl}
                download
                className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-stone-950"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function getPhotoOrientation(photo: GalleryPhoto) {
  if (!photo.width || !photo.height) return null;
  if (photo.width === photo.height) return "Square";
  return photo.width > photo.height ? "Landscape" : "Portrait";
}
