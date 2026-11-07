import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["text/plain", "txt"],
  ["text/csv", "csv"],
  ["text/markdown", "md"],
  ["application/json", "json"],
  ["application/zip", "zip"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

export class StorageError extends Error {}

function driver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

function s3() {
  return new S3Client({
    region: process.env.S3_REGION ?? "eu-west-2",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

function bucket() {
  const value = process.env.S3_BUCKET;
  if (!value) throw new StorageError("S3_BUCKET is not configured.");
  return value;
}

export function storageMode() {
  return driver();
}

export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "evidence";
}

export async function saveFile(file: File, workspaceId: string) {
  if (!file || file.size === 0) throw new StorageError("Choose a file to upload.");
  if (file.size > MAX_FILE_BYTES) throw new StorageError("Files must be 10 MB or smaller.");
  if (!ALLOWED.has(file.type)) {
    throw new StorageError(
      "That file type is not supported. Use PDF, PNG, JPG, WEBP, TXT, CSV, MD, JSON, ZIP, DOCX or XLSX.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) throw new StorageError("Files must be 10 MB or smaller.");
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const fileName = safeName(file.name);
  const storageKey = `workspaces/${workspaceId}/${randomUUID()}-${fileName}`;

  if (driver() === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
        Metadata: { checksum, workspace: workspaceId },
        ServerSideEncryption: "AES256",
      }),
    );
  } else {
    const fullPath = path.join(LOCAL_ROOT, storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
  }

  return { storageKey, checksum, sizeBytes: buffer.byteLength, fileName: file.name, mimeType: file.type };
}

export async function readStoredFile(storageKey: string): Promise<Uint8Array> {
  if (driver() === "s3") {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: storageKey }));
    if (!result.Body) throw new StorageError("File body was empty.");
    return new Uint8Array(await result.Body.transformToByteArray());
  }

  const normalized = storageKey.replaceAll("\\", "/");
  const fullPath = path.resolve(LOCAL_ROOT, normalized);
  if (!fullPath.startsWith(path.resolve(LOCAL_ROOT))) throw new StorageError("Invalid storage path.");
  return readFile(fullPath);
}

export async function deleteStoredFile(storageKey: string) {
  if (driver() === "s3") {
    // The database record is the audit trail; S3 objects remain until lifecycle expiry.
    return;
  }
  const fullPath = path.resolve(LOCAL_ROOT, storageKey.replaceAll("\\", "/"));
  if (!fullPath.startsWith(path.resolve(LOCAL_ROOT))) return;
  await unlink(fullPath).catch(() => undefined);
}
