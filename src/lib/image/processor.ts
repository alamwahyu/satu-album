import sharp from "sharp";
import type { FilmPresetConfig } from "@/features/presets/preset-config";

export type ProcessImageInput = {
  buffer: Buffer;
  preset?: FilmPresetConfig;
  maxWidth?: number;
  quality?: number;
};

export type ProcessImageOutput = {
  image: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  fileSize: number;
};

export interface ImageProcessor {
  process(input: ProcessImageInput): Promise<ProcessImageOutput>;
}

export class SharpImageProcessor implements ImageProcessor {
  async process(input: ProcessImageInput) {
    const maxWidth = input.maxWidth ?? 2400;
    const quality = input.quality ?? 84;
    const preset = input.preset;

    let pipeline = sharp(input.buffer).rotate().resize({ width: maxWidth, withoutEnlargement: true });

    if (preset) {
      pipeline = pipeline.modulate({
        brightness: preset.brightness,
        saturation: preset.saturation,
        hue: preset.temperature
      });
      pipeline = pipeline.linear(preset.contrast, -(128 * preset.contrast) + 128);
    }

    const image = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    const metadata = await sharp(image).metadata();
    const thumbnail = await sharp(image).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();

    return {
      image,
      thumbnail,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      fileSize: image.length
    };
  }
}

export const imageProcessor: ImageProcessor = new SharpImageProcessor();
