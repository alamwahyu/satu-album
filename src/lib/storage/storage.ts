import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appPath } from "@/lib/app-path";

export type StoragePutInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type PresignInput = {
  key: string;
  contentType: string;
  expiresIn?: number;
};

export interface StorageProvider {
  put(input: StoragePutInput): Promise<{ key: string; url: string }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  createUploadUrl?(input: PresignInput): Promise<{ url: string; key: string; headers?: Record<string, string> }>;
}

export function validateProductionStorageConfig() {
  if (process.env.VERCEL && process.env.STORAGE_PROVIDER !== "s3") {
    return {
      ok: false,
      message: "Photo storage is not configured for production. Set STORAGE_PROVIDER=s3 and configure S3/R2 environment variables in Vercel."
    };
  }

  if (process.env.STORAGE_PROVIDER === "s3") {
    const missing = ["S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"].filter((key) => !process.env[key]);
    if (missing.length > 0) {
      return {
        ok: false,
        message: `S3 storage is missing environment variables: ${missing.join(", ")}.`
      };
    }
  }

  return { ok: true, message: "" };
}

class LocalStorageProvider implements StorageProvider {
  private root = process.env.LOCAL_STORAGE_ROOT ?? "./uploads";
  private publicUrl = process.env.LOCAL_STORAGE_PUBLIC_URL ?? "/uploads";

  private resolveRoot() {
    return path.isAbsolute(this.root) ? path.resolve(this.root) : path.resolve(process.cwd(), this.root);
  }

  private resolveKey(key: string) {
    const root = this.resolveRoot();
    const filePath = path.resolve(root, key);
    if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) throw new Error("Invalid storage key.");
    return filePath;
  }

  async put(input: StoragePutInput) {
    const filePath = this.resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return { key: input.key, url: this.getPublicUrl(input.key) };
  }

  async get(key: string) {
    const filePath = this.resolveKey(key);
    return readFile(filePath);
  }

  async delete(key: string) {
    const filePath = this.resolveKey(key);
    await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  getPublicUrl(key: string) {
    const publicUrl = this.publicUrl.startsWith("/") ? appPath(this.publicUrl) : this.publicUrl;
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }
}

class S3StorageProvider implements StorageProvider {
  private bucket = process.env.S3_BUCKET ?? "";
  private client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: process.env.S3_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY ?? ""
        }
      : undefined
  });

  async put(input: StoragePutInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );
    return { key: input.key, url: this.getPublicUrl(input.key) };
  }

  async get(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
    if (!response.Body) throw new Error("Object not found.");
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
  }

  async createUploadUrl(input: PresignInput) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: input.expiresIn ?? 300 });
    return { url, key: input.key, headers: { "Content-Type": input.contentType } };
  }

  getPublicUrl(key: string) {
    const endpoint = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;
    return endpoint ? `${endpoint.replace(/\/$/, "")}/${this.bucket}/${key}` : key;
  }
}

export function storageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
}
