"use client";

import { useMemo, useState } from "react";
import { Download, Eye, EyeOff, Heart, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type HostPhoto = {
  id: string;
  thumbnailUrl: string;
  processedUrl: string;
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  isFavorite: boolean;
  capturedAt: Date | string;
  guest: { id: string; name: string };
  preset: { name: string } | null;
};

export function HostPhotoManager({ photos }: { photos: HostPhoto[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "HIDDEN" | "DELETED" | "FAVORITE">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (filter === "FAVORITE") return photo.isFavorite;
      if (filter === "ALL") return photo.status !== "DELETED";
      return photo.status === filter;
    });
  }, [filter, photos]);

  async function updatePhoto(photoId: string, payload: Record<string, unknown>, method = "PATCH") {
    setBusyId(photoId);
    await fetch(`/api/photos/${photoId}`, {
      method,
      headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
      body: method === "PATCH" ? JSON.stringify(payload) : undefined
    });
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "ACTIVE", "HIDDEN", "DELETED", "FAVORITE"] as const).map((item) => (
          <button
            key={item}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              filter === item ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-600"
            }`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {visiblePhotos.length === 0 ? (
        <p className="text-sm text-stone-500">No photos match this filter.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePhotos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              <img src={photo.thumbnailUrl} alt={`Captured by ${photo.guest.name}`} className="aspect-square w-full bg-stone-100 object-cover" />
              <div className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-950">{photo.guest.name}</p>
                    <p className="text-xs text-stone-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(photo.capturedAt))}</p>
                    <p className="mt-1 text-xs text-stone-500">{photo.status}{photo.preset?.name ? ` · ${photo.preset.name}` : ""}</p>
                  </div>
                  {photo.isFavorite ? <Heart className="h-5 w-5 fill-red-500 text-red-500" /> : null}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={busyId === photo.id || photo.status === "DELETED"}
                    aria-label={photo.isFavorite ? "Remove favorite" : "Favorite"}
                    onClick={() => updatePhoto(photo.id, { isFavorite: !photo.isFavorite })}
                  >
                    <Heart className={`h-4 w-4 ${photo.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={busyId === photo.id || photo.status === "DELETED"}
                    aria-label={photo.status === "HIDDEN" ? "Restore photo" : "Hide photo"}
                    onClick={() => updatePhoto(photo.id, { status: photo.status === "HIDDEN" ? "ACTIVE" : "HIDDEN" })}
                  >
                    {photo.status === "HIDDEN" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button asChild variant="secondary" size="icon" aria-label="Open photo">
                    <a href={photo.processedUrl} target="_blank" rel="noreferrer">
                      <RotateCcw className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="secondary" size="icon" aria-label="Download photo">
                    <a href={photo.processedUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant={photo.status === "DELETED" ? "secondary" : "destructive"}
                    size="icon"
                    disabled={busyId === photo.id}
                    aria-label={photo.status === "DELETED" ? "Restore deleted photo" : "Delete photo"}
                    onClick={() => (photo.status === "DELETED" ? updatePhoto(photo.id, { status: "ACTIVE" }) : updatePhoto(photo.id, {}, "DELETE"))}
                  >
                    {photo.status === "DELETED" ? <Eye className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
