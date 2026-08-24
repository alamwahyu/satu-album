import type { EventStatus, RevealMode } from "@prisma/client";

type EventTiming = {
  status: EventStatus;
  startAt: Date | null;
  endAt: Date | null;
  revealMode: RevealMode;
  revealAt: Date | null;
  disabledAt?: Date | null;
  deletedAt?: Date | null;
};

export function computeEventStatus(event: EventTiming, now = new Date()): EventStatus {
  if (event.deletedAt) return "ARCHIVED";
  if (event.disabledAt || event.status === "DISABLED") return "DISABLED";
  if (event.status === "ARCHIVED") return "ARCHIVED";
  if (event.status === "REVEALED") return "REVEALED";
  if (!event.startAt && !event.endAt) return event.status === "DRAFT" ? "DRAFT" : "UPCOMING";

  if (event.revealMode === "LIVE" && event.startAt && now >= event.startAt) return "REVEALED";
  if (event.revealMode === "CUSTOM" && event.revealAt && now >= event.revealAt) return "REVEALED";
  if (event.revealMode === "AFTER_EVENT" && event.endAt && now >= event.endAt) return "REVEALED";

  if (event.startAt && now < event.startAt) return "UPCOMING";
  if (event.endAt && now <= event.endAt) return "ACTIVE";
  if (event.revealMode === "MANUAL") return "COMPLETED";

  return "COMPLETED";
}

export function isAlbumRevealed(event: Pick<EventTiming, "status" | "revealMode" | "revealAt" | "endAt">, now = new Date()) {
  return computeEventStatus({ ...event, startAt: null }, now) === "REVEALED";
}
