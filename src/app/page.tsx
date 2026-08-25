import Link from "next/link";
import { Camera, Images, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: QrCode, title: "QR guest link", body: "Each event gets a private link and tokenized guest entry." },
  { icon: Camera, title: "Browser camera", body: "Guests capture moments from mobile Safari, Chrome, or desktop." },
  { icon: Images, title: "Reveal album", body: "Keep photos developing until live, event end, custom time, or manual reveal." },
  { icon: ShieldCheck, title: "Host control", body: "Limits, moderation, private events, and storage-ready architecture." }
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm">
            Disposable camera album for modern events
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-stone-950 md:text-7xl">
              AWH Album
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-600">
              Host creates an event, shares a QR code, guests take photos in the browser, and the album reveals when the moment is ready.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Create Event</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Host Login</Link>
            </Button>
          </div>
        </div>

        <div className="grain-surface overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-950 p-5 text-white shadow-2xl">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-[#f8f3ea] p-5 text-stone-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">Event</p>
                  <h2 className="text-2xl font-semibold">Alam & Ghina</h2>
                </div>
                <div className="rounded-xl bg-stone-950 px-3 py-2 text-sm text-white">24 shots</div>
              </div>
              <div className="mt-8 aspect-[4/5] rounded-2xl bg-[linear-gradient(135deg,#27221d,#9b7d57_48%,#f0d6a0)] shadow-inner" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-3xl font-semibold">124</p>
                <p className="text-sm text-white/65">Guests</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-3xl font-semibold">816</p>
                <p className="text-sm text-white/65">Photos</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-3xl font-semibold">Live</p>
                <p className="text-sm text-white/65">Reveal</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-4">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <feature.icon className="mb-5 h-6 w-6 text-stone-800" />
            <h3 className="font-semibold text-stone-950">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
