import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import { getFileExtension } from "@/lib/image-upload-rules";

export const TEMPERATURE_EQUIPMENT_EVIDENCE_FOLDER =
  "temperatura-equipamentos";

type LocalImageUpload = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

type StoredLocalImage = {
  url: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

export function getLocalImageStorageRoot(): string {
  const configuredPath = process.env.BPMA_UPLOAD_DIR?.trim();
  return configuredPath ? path.resolve(configuredPath) : DEFAULT_UPLOAD_ROOT;
}

function normalizeImageMimeType(mimeType: string): string {
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType || "image/jpeg";
}

function getImageExtension(fileName: string, mimeType: string): string {
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  const extension = getFileExtension(fileName);
  return extension || "jpg";
}

function buildUploadUrl(relativePath: string): string {
  return `/api/uploads/${relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export async function saveLocalImageUpload(params: {
  upload: LocalImageUpload;
  folder: string;
}): Promise<StoredLocalImage> {
  const storageRoot = getLocalImageStorageRoot();
  const targetFolder = path.join(storageRoot, params.folder);
  const createdAt = new Date();
  const mimeType = normalizeImageMimeType(params.upload.mimeType);
  const extension = getImageExtension(params.upload.fileName, mimeType);
  const fileName = `${createdAt.getTime()}-${randomUUID()}.${extension}`;
  const filePath = path.join(targetFolder, fileName);
  const relativePath = path.join(params.folder, fileName);

  await mkdir(targetFolder, { recursive: true });
  await writeFile(filePath, params.upload.buffer);

  return {
    url: buildUploadUrl(relativePath),
    mimeType,
    size: params.upload.buffer.byteLength,
    createdAt
  };
}

export async function saveTemperatureEquipmentEvidenceImage(
  upload: LocalImageUpload
): Promise<StoredLocalImage> {
  return saveLocalImageUpload({
    upload,
    folder: TEMPERATURE_EQUIPMENT_EVIDENCE_FOLDER
  });
}

export async function readStoredImage(relativeSegments: string[]): Promise<{
  bytes: Buffer;
  mimeType: string;
  size: number;
}> {
  if (
    relativeSegments.length === 0 ||
    relativeSegments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
    )
  ) {
    throw new Error("Caminho de imagem inválido.");
  }

  const storageRoot = getLocalImageStorageRoot();
  const filePath = path.resolve(storageRoot, ...relativeSegments);
  const relativePath = path.relative(storageRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Caminho de imagem inválido.");
  }

  const [bytes, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
  const extension = getFileExtension(filePath);
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  return {
    bytes,
    mimeType,
    size: fileStat.size
  };
}
