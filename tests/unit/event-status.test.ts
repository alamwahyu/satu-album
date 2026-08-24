import { describe, expect, it } from "vitest";
import { computeEventStatus, isAlbumRevealed } from "@/features/events/status";

describe("event status", () => {
  it("returns upcoming before start time", () => {
    expect(
      computeEventStatus(
        {
          status: "DRAFT",
          startAt: new Date("2026-08-24T10:00:00.000Z"),
          endAt: new Date("2026-08-24T12:00:00.000Z"),
          revealMode: "AFTER_EVENT",
          revealAt: null
        },
        new Date("2026-08-24T09:00:00.000Z")
      )
    ).toBe("UPCOMING");
  });

  it("reveals after event when configured", () => {
    const event = {
      status: "ACTIVE" as const,
      startAt: new Date("2026-08-24T10:00:00.000Z"),
      endAt: new Date("2026-08-24T12:00:00.000Z"),
      revealMode: "AFTER_EVENT" as const,
      revealAt: null
    };
    expect(computeEventStatus(event, new Date("2026-08-24T12:01:00.000Z"))).toBe("REVEALED");
    expect(isAlbumRevealed(event, new Date("2026-08-24T12:01:00.000Z"))).toBe(true);
  });

  it("keeps manual reveal completed until host reveals", () => {
    expect(
      computeEventStatus(
        {
          status: "ACTIVE",
          startAt: new Date("2026-08-24T10:00:00.000Z"),
          endAt: new Date("2026-08-24T12:00:00.000Z"),
          revealMode: "MANUAL",
          revealAt: null
        },
        new Date("2026-08-24T12:01:00.000Z")
      )
    ).toBe("COMPLETED");
  });

  it("honors persisted revealed status", () => {
    expect(
      computeEventStatus(
        {
          status: "REVEALED",
          startAt: null,
          endAt: null,
          revealMode: "MANUAL",
          revealAt: new Date("2026-08-24T13:00:00.000Z")
        },
        new Date("2026-08-24T14:00:00.000Z")
      )
    ).toBe("REVEALED");
  });
});
