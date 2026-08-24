"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ImageUp, Images, Loader2, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type CameraCaptureProps = {
  slug: string;
  eventName: string;
  guestName: string;
  initialShotsRemaining: number;
  photoLimit: number;
};

type UploadState = "idle" | "starting" | "processing" | "uploading" | "saved" | "failed";

export function CameraCapture({ slug, eventName, guestName, initialShotsRemaining, photoLimit }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [shotsRemaining, setShotsRemaining] = useState(initialShotsRemaining);
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setStatus("starting");
      setError("");
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 2560 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setStatus("idle");
      } catch {
        setCameraReady(false);
        setStatus("idle");
        setError("Camera permission denied or unavailable. Use image upload instead.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facingMode]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function capture() {
    if (!videoRef.current || shotsRemaining <= 0 || status === "processing" || status === "uploading") return;
    setStatus("processing");
    setError("");

    try {
      const blob = await videoToJpeg(videoRef.current);
      await uploadBlob(blob);
    } catch {
      setStatus("failed");
      setError("Unable to capture photo. Please try again or use upload.");
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (shotsRemaining <= 0) {
      setError("Photo limit reached.");
      return;
    }

    setStatus("processing");
    setError("");

    try {
      const blob = await fileToJpeg(file);
      await uploadBlob(blob);
    } catch {
      setStatus("failed");
      setError("Unable to process that image.");
    }
  }

  async function uploadBlob(blob: Blob) {
    setStatus("uploading");
    const formData = new FormData();
    formData.append("photo", blob, "capture.jpg");
    formData.append("capturedAt", new Date().toISOString());

    const response = await fetch(`/api/guest/events/${slug}/photos`, {
      method: "POST",
      body: formData
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus("failed");
      setError(data?.error?.message ?? "Unable to upload photo.");
      return;
    }

    setLastImageUrl(data.photo.thumbnailUrl ?? data.photo.processedUrl);
    setShotsRemaining(data.photo.shotsRemaining);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  const busy = status === "starting" || status === "processing" || status === "uploading";
  const limitReached = shotsRemaining <= 0;

  return (
    <main className="min-h-dvh bg-[#14110e] text-white">
      <section className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
        <header className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{eventName}</p>
            <h1 className="mt-1 text-xl font-semibold">Disposable Camera</h1>
          </div>
          <Link href={`/e/${slug}/gallery`} className="rounded-full bg-white/10 p-3" aria-label="Open gallery">
            <Images className="h-5 w-5" />
          </Link>
        </header>

        <div className="my-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <p className="text-sm text-white/65">Shots remaining</p>
          <p className="text-2xl font-semibold">
            {shotsRemaining} / {photoLimit}
          </p>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {!cameraReady ? (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#1f1b16,#74604a_45%,#d4af7a)] px-8 text-center">
              <div>
                <Camera className="mx-auto h-12 w-12 text-white/75" />
                <p className="mt-5 text-lg font-semibold">Camera unavailable</p>
                <p className="mt-2 text-sm leading-6 text-white/65">Allow camera permission or upload an image from this device.</p>
              </div>
            </div>
          ) : null}
          {lastImageUrl ? (
            <img src={lastImageUrl} alt="Last saved photo" className="absolute bottom-4 left-4 h-16 w-16 rounded-xl border border-white/20 object-cover shadow-lg" />
          ) : null}
          {busy ? (
            <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-sm">
              <div className="rounded-2xl bg-white px-5 py-4 text-center text-stone-950 shadow-xl">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                <p className="mt-2 text-sm font-semibold">{status === "processing" ? "Processing photo..." : status === "uploading" ? "Uploading..." : "Starting camera..."}</p>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="grid gap-4 py-5">
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-100">{error}</p> : null}
          {status === "saved" ? <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-center text-sm text-emerald-100">Saved</p> : null}
          {limitReached ? <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white/75">Photo limit reached.</p> : null}

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Switch camera"
              disabled={busy}
              onClick={() => setFacingMode((mode) => (mode === "environment" ? "user" : "environment"))}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <button
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-white/40 bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.08)] disabled:opacity-50"
              disabled={busy || limitReached || !cameraReady}
              aria-label="Capture photo"
              onClick={capture}
            >
              <span className="h-14 w-14 rounded-full bg-stone-950" />
            </button>
            <Button variant="secondary" size="icon" aria-label="Upload image" disabled={busy || limitReached} onClick={() => fileInputRef.current?.click()}>
              <ImageUp className="h-5 w-5" />
            </Button>
          </div>
          <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
          <div className="flex items-center justify-center gap-2 text-center text-sm text-white/45">
            <Zap className="h-4 w-4" />
            Signed in as {guestName}
          </div>
        </footer>
      </section>
    </main>
  );
}

async function videoToJpeg(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const width = video.videoWidth;
  const height = video.videoHeight;
  return drawToJpeg(video, canvas, width, height);
}

async function fileToJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  return drawToJpeg(bitmap, canvas, bitmap.width, bitmap.height);
}

function drawToJpeg(source: CanvasImageSource, canvas: HTMLCanvasElement, sourceWidth: number, sourceHeight: number) {
  const maxWidth = 2400;
  const scale = Math.min(1, maxWidth / sourceWidth);
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Image compression failed."));
        else resolve(blob);
      },
      "image/jpeg",
      0.86
    );
  });
}
