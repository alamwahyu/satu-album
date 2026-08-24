import { formatBytes } from "@/lib/utils";

export type EventAnalytics = {
  guestsJoined: number;
  photosCaptured: number;
  averagePhotosPerGuest: number;
  mostActiveGuest: { id: string; name: string; photos: number } | null;
  peakCaptureTime: { hour: string; photos: number } | null;
  storageUsed: number;
  photosByHour: { hour: string; count: number }[];
};

export function EventAnalyticsPanel({ analytics }: { analytics: EventAnalytics }) {
  const max = Math.max(...analytics.photosByHour.map((item) => item.count), 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Guests Joined" value={analytics.guestsJoined} />
        <Metric label="Photos Captured" value={analytics.photosCaptured} />
        <Metric label="Avg Photos / Guest" value={analytics.averagePhotosPerGuest.toFixed(1)} />
        <Metric label="Most Active Guest" value={analytics.mostActiveGuest ? `${analytics.mostActiveGuest.name} (${analytics.mostActiveGuest.photos})` : "-"} />
        <Metric label="Peak Capture Time" value={analytics.peakCaptureTime ? `${analytics.peakCaptureTime.hour} (${analytics.peakCaptureTime.photos})` : "-"} />
        <Metric label="Storage Used" value={formatBytes(analytics.storageUsed)} />
      </div>

      <div className="rounded-lg bg-stone-50 p-4">
        <p className="mb-4 font-medium text-stone-950">Photos by Hour</p>
        <div className="space-y-3">
          {analytics.photosByHour.length === 0 ? <p className="text-sm text-stone-500">No capture data yet.</p> : null}
          {analytics.photosByHour.map((item) => (
            <div key={item.hour} className="grid grid-cols-[56px_1fr_36px] items-center gap-3 text-sm">
              <span className="text-stone-500">{item.hour}</span>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-stone-950" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
              <span className="text-right font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
