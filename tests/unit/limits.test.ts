import { describe, expect, it } from "vitest";

function canJoin(guestCount: number, guestLimit: number | null) {
  return guestLimit === null || guestCount < guestLimit;
}

function canCapture(photoCount: number, photoLimit: number) {
  return photoCount < photoLimit;
}

describe("limits", () => {
  it("blocks guest after event guest limit", () => {
    expect(canJoin(100, 100)).toBe(false);
    expect(canJoin(99, 100)).toBe(true);
    expect(canJoin(1000, null)).toBe(true);
  });

  it("blocks capture at per guest photo limit", () => {
    expect(canCapture(23, 24)).toBe(true);
    expect(canCapture(24, 24)).toBe(false);
  });
});
