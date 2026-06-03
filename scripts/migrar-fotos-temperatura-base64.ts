import "dotenv/config";

import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";
type Mode = "migrar" | "limpar";

type ParsedImage = {
  buffer: Buffer;
  mimeType: ImageMimeType;
  extension: "jpg" | "png" | "webp";
};

const prisma = new PrismaClient();
const UPLOAD_ROUTE_PREFIX = "/api/uploads";
const TEMPERATURE_FOLDER = "temperatura-equipamentos";
const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

function parseArgs(): { mode: Mode; dryRun: boolean } {
  const args = process.argv.slice(2);
  const mode = args.includes("limpar") ? "limpar" : "migrar";
  const dryRun = args.includes("--dry-run") || args.includes("dry-run");

  return { mode, dryRun };
}

function getUploadRoot(): string {
  const configuredPath = process.env.BPMA_UPLOAD_DIR?.trim();

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BPMA_UPLOAD_DIR precisa estar configurado em producao antes de migrar ou limpar fotos."
    );
  }

  return DEFAULT_UPLOAD_ROOT;
}

function detectMimeType(buffer: Buffer): ImageMimeType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function mimeTypeToExtension(mimeType: ImageMimeType): ParsedImage["extension"] {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function normalizeMimeType(value: string | null | undefined): ImageMimeType | null {
  const mimeType = value?.trim().toLowerCase();

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return "image/jpeg";
  }

  if (mimeType === "image/png") {
    return "image/png";
  }

  if (mimeType === "image/webp") {
    return "image/webp";
  }

  return null;
}

function parseBase64Image(value: string, fallbackMimeType?: string | null): ParsedImage {
  const trimmed = value.trim();
  const dataUrlMatch = trimmed.match(
    /^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]*)$/i
  );
  const prefixMimeType = normalizeMimeType(dataUrlMatch?.[1]);
  const base64Content = (dataUrlMatch?.[2] ?? trimmed).replace(/\s/g, "");

  if (!base64Content) {
    throw new Error("base64 vazio");
  }

  const buffer = Buffer.from(base64Content, "base64");
  const detectedMimeType = detectMimeType(buffer);
  const mimeType =
    detectedMimeType ?? prefixMimeType ?? normalizeMimeType(fallbackMimeType);

  if (!mimeType) {
    throw new Error("conteudo nao parece ser JPG, PNG ou WEBP");
  }

  if (buffer.length === 0) {
    throw new Error("imagem gerou arquivo vazio");
  }

  return {
    buffer,
    mimeType,
    extension: mimeTypeToExtension(mimeType)
  };
}

function getDateSegments(date: Date): { year: string; month: string } {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0")
  };
}

function buildRelativePath(params: {
  id: number;
  data: Date;
  extension: ParsedImage["extension"];
}): string {
  const { year, month } = getDateSegments(params.data);
  const fileName = `${params.id}-${Date.now()}.${params.extension}`;

  return path.posix.join(TEMPERATURE_FOLDER, year, month, fileName);
}

function buildUrl(relativePath: string): string {
  return `${UPLOAD_ROUTE_PREFIX}/${relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function assertPathInsideRoot(root: string, filePath: string): void {
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("caminho de arquivo fora do diretorio de uploads");
  }
}

async function saveImage(params: {
  uploadRoot: string;
  relativePath: string;
  buffer: Buffer;
}): Promise<string> {
  const relativeSegments = params.relativePath.split("/");
  const filePath = path.resolve(params.uploadRoot, ...relativeSegments);

  assertPathInsideRoot(params.uploadRoot, filePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, params.buffer);

  return filePath;
}

function estimateTextBytes(value: string | null): number {
  return Buffer.byteLength(value ?? "", "utf8");
}

function parseStoredUploadUrl(uploadRoot: string, url: string): string {
  const parsedUrl = new URL(url, "http://local");
  const pathname = parsedUrl.pathname;

  if (!pathname.startsWith(`${UPLOAD_ROUTE_PREFIX}/`)) {
    throw new Error("fotoUrl nao aponta para storage local do app");
  }

  const relativePath = pathname
    .slice(UPLOAD_ROUTE_PREFIX.length + 1)
    .split("/")
    .map((segment) => decodeURIComponent(segment));

  if (
    relativePath.length === 0 ||
    relativePath.some(
      (segment) => !segment || segment === "." || segment === ".."
    )
  ) {
    throw new Error("fotoUrl possui caminho invalido");
  }

  const filePath = path.resolve(uploadRoot, ...relativePath);
  assertPathInsideRoot(uploadRoot, filePath);

  return filePath;
}

async function migrateBase64Photos(dryRun: boolean): Promise<void> {
  const uploadRoot = getUploadRoot();
  const records = await prisma.controleTemperaturaEquipamento.findMany({
    where: {
      fotoBase64: { not: null },
      NOT: [{ fotoBase64: "" }],
      OR: [{ fotoUrl: null }, { fotoUrl: "" }]
    },
    select: {
      id: true,
      data: true,
      createdAt: true,
      fotoBase64: true,
      fotoMimeType: true,
      fotoNome: true,
      fotoCriadoEm: true
    },
    orderBy: { id: "asc" }
  });

  let migrated = 0;
  let ignored = 0;
  let errors = 0;
  let migratedBytes = 0;
  const failedIds: number[] = [];

  console.log(`Modo: migrar${dryRun ? " (dry-run)" : ""}`);
  console.log(`Diretorio de upload: ${uploadRoot}`);
  console.log(`Registros encontrados: ${records.length}`);

  for (const record of records) {
    try {
      if (!record.fotoBase64?.trim()) {
        ignored += 1;
        continue;
      }

      const image = parseBase64Image(record.fotoBase64, record.fotoMimeType);
      const relativePath = buildRelativePath({
        id: record.id,
        data: record.data,
        extension: image.extension
      });
      const fotoUrl = buildUrl(relativePath);

      if (!dryRun) {
        await saveImage({
          uploadRoot,
          relativePath,
          buffer: image.buffer
        });

        await prisma.controleTemperaturaEquipamento.update({
          where: { id: record.id },
          data: {
            fotoUrl,
            fotoTamanhoBytes: image.buffer.byteLength,
            fotoCriadoEm: record.fotoCriadoEm ?? record.createdAt,
            fotoMimeType: image.mimeType,
            fotoNome:
              record.fotoNome?.trim() ||
              path.posix.basename(relativePath)
          }
        });
      }

      migrated += 1;
      migratedBytes += image.buffer.byteLength;
    } catch (error) {
      errors += 1;
      failedIds.push(record.id);
      console.error(
        `Falha ao migrar registro ${record.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log("Resumo da migracao:");
  console.log(`- migrados: ${migrated}`);
  console.log(`- ignorados: ${ignored}`);
  console.log(`- erros: ${errors}`);
  console.log(`- tamanho aproximado migrado: ${formatBytes(migratedBytes)}`);
  console.log(`- IDs com falha: ${failedIds.length ? failedIds.join(", ") : "-"}`);
  console.log("- fotoBase64 foi preservado nesta etapa.");
}

async function cleanMigratedBase64(dryRun: boolean): Promise<void> {
  const uploadRoot = getUploadRoot();
  const records = await prisma.controleTemperaturaEquipamento.findMany({
    where: {
      fotoBase64: { not: null },
      NOT: [{ fotoBase64: "" }],
      fotoUrl: { not: null }
    },
    select: {
      id: true,
      fotoBase64: true,
      fotoUrl: true
    },
    orderBy: { id: "asc" }
  });

  let eligible = 0;
  let cleaned = 0;
  let missingFile = 0;
  let errors = 0;
  let estimatedReduction = 0;
  const failedIds: number[] = [];

  console.log(`Modo: limpar${dryRun ? " (dry-run)" : ""}`);
  console.log(`Diretorio de upload: ${uploadRoot}`);
  console.log(`Registros com base64 e fotoUrl: ${records.length}`);

  for (const record of records) {
    try {
      if (!record.fotoUrl?.trim() || !record.fotoBase64?.trim()) {
        continue;
      }

      const filePath = parseStoredUploadUrl(uploadRoot, record.fotoUrl);
      const fileStat = await stat(filePath).catch(() => null);

      if (!fileStat || fileStat.size <= 0) {
        missingFile += 1;
        continue;
      }

      eligible += 1;
      estimatedReduction += estimateTextBytes(record.fotoBase64);

      if (!dryRun) {
        await prisma.controleTemperaturaEquipamento.update({
          where: { id: record.id },
          data: { fotoBase64: null }
        });
      }

      cleaned += 1;
    } catch (error) {
      errors += 1;
      failedIds.push(record.id);
      console.error(
        `Falha ao limpar registro ${record.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log("Resumo da limpeza:");
  console.log(`- elegiveis: ${eligible}`);
  console.log(`- limpos: ${cleaned}`);
  console.log(`- ignorados por arquivo inexistente/invalido: ${missingFile}`);
  console.log(`- erros: ${errors}`);
  console.log(`- reducao estimada: ${formatBytes(estimatedReduction)}`);
  console.log(`- IDs com falha: ${failedIds.length ? failedIds.join(", ") : "-"}`);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${bytes} B`;
}

async function main(): Promise<void> {
  const { mode, dryRun } = parseArgs();

  if (mode === "limpar") {
    await cleanMigratedBase64(dryRun);
    return;
  }

  await migrateBase64Photos(dryRun);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
