"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function QrActions({ eventName, guestUrl, png, svg }: { eventName: string; guestUrl: string; png: string; svg: string }) {
  const [copied, setCopied] = useState(false);

  function download(data: string, filename: string, type?: string) {
    const href = data.startsWith("data:") ? data : URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    if (!data.startsWith("data:")) URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-stone-50 p-4">
        <p className="text-sm text-stone-500">Event link</p>
        <p className="mt-2 break-all font-medium text-stone-950">{guestUrl}</p>
      </div>
      <div className="grid gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(guestUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy Event Link
        </Button>
        <Button variant="secondary" onClick={() => download(png, `${eventName}-qr.png`)}>
          <Download className="h-4 w-4" />
          Download QR PNG
        </Button>
        <Button variant="secondary" onClick={() => download(svg, `${eventName}-qr.svg`, "image/svg+xml")}>
          <Download className="h-4 w-4" />
          Download QR SVG
        </Button>
      </div>
    </div>
  );
}
