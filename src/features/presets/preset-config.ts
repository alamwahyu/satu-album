export type FilmPresetConfig = {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  grain: number;
  vignette: number;
};

export const filmPresets = [
  {
    name: "Classic Warm",
    slug: "classic-warm",
    description: "Warm highlights with restrained contrast for indoor events.",
    config: { brightness: 1.02, contrast: 1.08, saturation: 0.92, temperature: 8, grain: 0.12, vignette: 0.08 }
  },
  {
    name: "Soft Film",
    slug: "soft-film",
    description: "Gentle color and lower contrast for skin-friendly portraits.",
    config: { brightness: 1.04, contrast: 0.96, saturation: 0.9, temperature: 3, grain: 0.08, vignette: 0.04 }
  },
  {
    name: "Vintage Fade",
    slug: "vintage-fade",
    description: "A muted nostalgic look with lifted shadows.",
    config: { brightness: 1.01, contrast: 0.9, saturation: 0.78, temperature: 6, grain: 0.14, vignette: 0.1 }
  },
  {
    name: "Cinema Night",
    slug: "cinema-night",
    description: "Deeper contrast for evening receptions and dim rooms.",
    config: { brightness: 0.98, contrast: 1.18, saturation: 0.86, temperature: -3, grain: 0.1, vignette: 0.14 }
  },
  {
    name: "Golden Hour",
    slug: "golden-hour",
    description: "Soft amber temperature with bright mids.",
    config: { brightness: 1.05, contrast: 1.04, saturation: 0.98, temperature: 12, grain: 0.07, vignette: 0.06 }
  },
  {
    name: "B&W Grain",
    slug: "bw-grain",
    description: "Monochrome-style contrast with visible but natural grain.",
    config: { brightness: 1.0, contrast: 1.16, saturation: 0, temperature: 0, grain: 0.18, vignette: 0.12 }
  },
  {
    name: "Cool Disposable",
    slug: "cool-disposable",
    description: "Crisp blues and compact-camera contrast.",
    config: { brightness: 1.0, contrast: 1.1, saturation: 0.88, temperature: -8, grain: 0.11, vignette: 0.07 }
  },
  {
    name: "Retro Green",
    slug: "retro-green",
    description: "Subtle green tint and faded saturation.",
    config: { brightness: 1.0, contrast: 0.98, saturation: 0.82, temperature: -2, grain: 0.13, vignette: 0.09 }
  }
] as const;
