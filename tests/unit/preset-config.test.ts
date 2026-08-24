import { describe, expect, it } from "vitest";
import { filmPresets } from "@/features/presets/preset-config";

describe("film presets", () => {
  it("has unique slugs and bounded natural grain", () => {
    const slugs = new Set(filmPresets.map((preset) => preset.slug));
    expect(slugs.size).toBe(filmPresets.length);
    for (const preset of filmPresets) {
      expect(preset.config.grain).toBeGreaterThanOrEqual(0);
      expect(preset.config.grain).toBeLessThanOrEqual(0.2);
      expect(preset.config.brightness).toBeGreaterThan(0);
      expect(preset.config.contrast).toBeGreaterThan(0);
    }
  });
});
