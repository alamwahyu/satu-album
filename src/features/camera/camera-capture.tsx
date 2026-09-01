"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ImageUp, Images, Loader2, Palette, RectangleHorizontal, RectangleVertical, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appPath } from "@/lib/app-path";

type CameraCaptureProps = {
  slug: string;
  eventName: string;
  eventDate: string;
  guestName: string;
  themeBackgroundColor: string;
  themeSurfaceColor: string;
  themeAccentColor: string;
  initialShotsRemaining: number;
  photoLimit: number;
};

type UploadState = "idle" | "starting" | "processing" | "uploading" | "saved" | "failed";
type CameraOrientation = "portrait" | "landscape";
type CameraFrame = "none" | "minimal" | "classic" | "dark";

const frameOptions: { value: CameraFrame; label: string }[] = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "classic", label: "Classic" },
  { value: "dark", label: "Dark" }
];

export function CameraCapture({
  slug,
  eventName,
  eventDate,
  guestName,
  themeBackgroundColor,
  themeSurfaceColor,
  themeAccentColor,
  initialShotsRemaining,
  photoLimit
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [shotsRemaining, setShotsRemaining] = useState(initialShotsRemaining);
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [orientation, setOrientation] = useState<CameraOrientation>("portrait");
  const [frame, setFrame] = useState<CameraFrame>("none");
  const eventDateLabel = formatEventDate(eventDate);

  useEffect(() => {
    if (!cameraRequested) return;
    let cancelled = false;

    async function startCamera() {
      setStatus("starting");
      setError("");
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: orientation === "portrait" ? 1920 : 2560 },
            height: { ideal: orientation === "portrait" ? 2560 : 1920 }
          },
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
  }, [cameraRequested, facingMode, orientation]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function requestCamera() {
    setCameraRequested(true);
  }

  function changeOrientation(nextOrientation: CameraOrientation) {
    setOrientation(nextOrientation);
    setError("");
  }

  async function capture() {
    if (!videoRef.current || shotsRemaining <= 0 || status === "processing" || status === "uploading") return;
    setStatus("processing");
    setError("");

    try {
      const blob = await videoToJpeg(videoRef.current, { orientation, frame, eventName, eventDateLabel });
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
      const blob = await fileToJpeg(file, { orientation, frame, eventName, eventDateLabel });
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

    const response = await fetch(appPath(`/api/guest/events/${slug}/photos`), {
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
    <main className="min-h-dvh text-white" style={{ backgroundColor: themeBackgroundColor }}>
      <section className="mx-auto flex min-h-dvh max-w-md flex-col px-3 py-3">
        <header className="flex items-center justify-between py-1">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{eventName}</p>
            <h1 className="mt-1 text-xl font-semibold">Disposable Camera</h1>
          </div>
          <Link href={`/e/${slug}/gallery`} className="rounded-full border border-white/10 p-3" style={{ backgroundColor: themeSurfaceColor }} aria-label="Open gallery">
            <Images className="h-5 w-5" />
          </Link>
        </header>

        <div className="my-3 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5" style={{ backgroundColor: themeSurfaceColor }}>
          <p className="text-sm text-white/65">Shots remaining</p>
          <p className="text-2xl font-semibold">
            {shotsRemaining} / {photoLimit}
          </p>
        </div>

        <div className="grid flex-1 place-items-center overflow-hidden rounded-[2rem] border border-white/10 bg-black p-1.5 shadow-2xl">
          <div className={`relative overflow-hidden rounded-[1.5rem] bg-black ${orientation === "portrait" ? "aspect-[3/4] h-full max-h-full max-w-full" : "aspect-[4/3] w-full max-h-full"}`}>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <FrameOverlay frame={frame} eventName={eventName} eventDateLabel={eventDateLabel} />
            {!cameraReady ? (
              <div
                className="absolute inset-0 grid place-items-center px-8 text-center"
                style={{ background: `linear-gradient(135deg, ${themeBackgroundColor}, ${themeSurfaceColor} 48%, ${themeAccentColor})` }}
              >
                <div>
                  <Camera className="mx-auto h-12 w-12 text-white/75" />
                  <p className="mt-5 text-lg font-semibold">{cameraRequested ? "Camera unavailable" : "Ready to take photos"}</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {cameraRequested ? "Allow camera permission or upload an image from this device." : "Tap Start Camera and allow permission when your browser asks."}
                  </p>
                  {!cameraRequested ? (
                    <Button className="mt-5" variant="secondary" onClick={requestCamera}>
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </Button>
                  ) : null}
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
        </div>

        <footer className="grid gap-3 py-3">
          {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-100">{error}</p> : null}
          {status === "saved" ? <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-center text-sm text-emerald-100">Saved</p> : null}
          {limitReached ? <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white/75">Photo limit reached.</p> : null}

          <div className="mx-auto grid w-full max-w-sm grid-cols-[44px_44px_1fr_44px_44px] items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Switch camera"
              disabled={busy}
              onClick={() => {
                setCameraRequested(true);
                setFacingMode((mode) => (mode === "environment" ? "user" : "environment"));
              }}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              disabled={busy}
              onClick={() => changeOrientation(orientation === "portrait" ? "landscape" : "portrait")}
              aria-label={orientation === "portrait" ? "Switch to landscape" : "Switch to portrait"}
            >
              {orientation === "portrait" ? <RectangleVertical className="h-5 w-5" /> : <RectangleHorizontal className="h-5 w-5" />}
            </Button>
            <button
              className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white/40 bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.08)] disabled:opacity-50"
              disabled={busy || limitReached || !cameraReady}
              aria-label="Capture photo"
              onClick={capture}
            >
              <span className="h-14 w-14 rounded-full" style={{ backgroundColor: themeAccentColor }} />
            </button>
            <label className="relative grid h-10 w-10 place-items-center rounded-lg border border-stone-200 bg-white text-stone-950 shadow-sm">
              <Palette className="h-5 w-5" />
              <select
                value={frame}
                onChange={(event) => setFrame(event.target.value as CameraFrame)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Photo frame"
                disabled={busy}
              >
                {frameOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" size="icon" aria-label="Upload image" disabled={busy || limitReached} onClick={() => fileInputRef.current?.click()}>
              <ImageUp className="h-5 w-5" />
            </Button>
          </div>
          <input ref={fileInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
          <div className="flex items-center justify-center gap-2 text-center text-xs text-white/45">
            <Zap className="h-4 w-4" />
            Signed in as {guestName}
          </div>
        </footer>
      </section>
    </main>
  );
}

type CaptureRenderOptions = {
  orientation: CameraOrientation;
  frame: CameraFrame;
  eventName: string;
  eventDateLabel: string;
};

function FrameOverlay({ frame, eventName, eventDateLabel }: { frame: CameraFrame; eventName: string; eventDateLabel: string }) {
  if (frame === "none") return null;

  if (frame === "classic") {
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between border-[10px] border-[#f6efe3] text-center text-stone-950">
        <div className="bg-[#f6efe3] px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.22em]">{eventDateLabel}</div>
        <div className="bg-[#f6efe3] px-4 pb-4 pt-3">
          <p className="truncate font-serif text-lg font-semibold">{eventName}</p>
        </div>
      </div>
    );
  }

  if (frame === "dark") {
    return (
      <div className="pointer-events-none absolute inset-0 border-[8px] border-black/80">
        <div className="absolute inset-x-0 bottom-0 bg-black/72 px-4 py-4 text-center">
          <p className="truncate text-sm font-semibold text-white">{eventName}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d8b16c]">{eventDateLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-4 border border-white/75">
      <div className="absolute inset-x-3 bottom-3 text-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
        <p className="truncate text-sm font-semibold">{eventName}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">{eventDateLabel}</p>
      </div>
    </div>
  );
}

async function videoToJpeg(video: HTMLVideoElement, options: CaptureRenderOptions) {
  const canvas = document.createElement("canvas");
  const width = video.videoWidth;
  const height = video.videoHeight;
  return drawToJpeg(video, canvas, width, height, options);
}

async function fileToJpeg(file: File, options: CaptureRenderOptions) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  return drawToJpeg(bitmap, canvas, bitmap.width, bitmap.height, options);
}

function drawToJpeg(source: CanvasImageSource, canvas: HTMLCanvasElement, sourceWidth: number, sourceHeight: number, options: CaptureRenderOptions) {
  const targetRatio = options.orientation === "portrait" ? 3 / 4 : 4 / 3;
  const sourceRatio = sourceWidth / sourceHeight;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  const maxLongEdge = 2400;
  const scale = Math.min(1, maxLongEdge / Math.max(cropWidth, cropHeight));
  canvas.width = Math.round(cropWidth * scale);
  canvas.height = Math.round(cropHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  drawFrame(context, canvas.width, canvas.height, options);

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

function drawFrame(context: CanvasRenderingContext2D, width: number, height: number, options: CaptureRenderOptions) {
  if (options.frame === "none") return;

  const shortEdge = Math.min(width, height);
  const padding = Math.round(shortEdge * 0.045);
  const titleSize = Math.max(28, Math.round(width * 0.045));
  const dateSize = Math.max(18, Math.round(width * 0.024));
  const title = options.eventName;
  const date = options.eventDateLabel.toUpperCase();

  context.save();

  if (options.frame === "classic") {
    const border = Math.round(shortEdge * 0.045);
    const topBand = Math.round(height * 0.085);
    const bottomBand = Math.round(height * 0.13);
    context.fillStyle = "#f6efe3";
    context.fillRect(0, 0, width, border + topBand);
    context.fillRect(0, height - border - bottomBand, width, border + bottomBand);
    context.fillRect(0, 0, border, height);
    context.fillRect(width - border, 0, border, height);
    context.fillStyle = "#1c1917";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 ${dateSize}px sans-serif`;
    drawFittedText(context, date, width / 2, border + topBand / 2, width - border * 3);
    context.font = `700 ${titleSize}px Georgia, serif`;
    drawFittedText(context, title, width / 2, height - border - bottomBand / 2, width - border * 3);
  } else if (options.frame === "dark") {
    const border = Math.round(shortEdge * 0.04);
    const bottomBand = Math.round(height * 0.15);
    context.fillStyle = "rgba(0, 0, 0, 0.82)";
    context.fillRect(0, 0, width, border);
    context.fillRect(0, height - border - bottomBand, width, border + bottomBand);
    context.fillRect(0, 0, border, height);
    context.fillRect(width - border, 0, border, height);
    context.strokeStyle = "#d8b16c";
    context.lineWidth = Math.max(2, Math.round(shortEdge * 0.006));
    context.strokeRect(border * 1.5, border * 1.5, width - border * 3, height - border * 3);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px sans-serif`;
    drawFittedText(context, title, width / 2, height - border - bottomBand * 0.58, width - border * 4);
    context.fillStyle = "#d8b16c";
    context.font = `700 ${dateSize}px sans-serif`;
    drawFittedText(context, date, width / 2, height - border - bottomBand * 0.28, width - border * 4);
  } else {
    const border = Math.max(3, Math.round(shortEdge * 0.006));
    context.strokeStyle = "rgba(255, 255, 255, 0.88)";
    context.lineWidth = border;
    context.strokeRect(padding, padding, width - padding * 2, height - padding * 2);
    const gradient = context.createLinearGradient(0, height * 0.68, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.72)");
    context.fillStyle = gradient;
    context.fillRect(0, height * 0.68, width, height * 0.32);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px sans-serif`;
    drawFittedText(context, title, width / 2, height - padding * 2.4, width - padding * 4);
    context.font = `700 ${dateSize}px sans-serif`;
    drawFittedText(context, date, width / 2, height - padding * 1.25, width - padding * 4);
  }

  context.restore();
}

function drawFittedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let clipped = text;
  while (clipped.length > 1 && context.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  context.fillText(`${clipped}...`, x, y);
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
