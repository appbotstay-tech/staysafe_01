import "dotenv/config";

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";
type Mode = "migrar" | "limpar" | "reparar" | "diagnosticar";

type ParsedImage = {
  buffer: Buffer;
  mimeType: ImageMimeType;
  extension: "jpg" | "png" | "webp";
};

type ResolvedStoredPhotoPath = {
  filePath: string;
  source: "api-route" | "uploads-route" | "relative" | "absolute";
};

type IneligibleReason =
  | "fotoUrl vazia"
  | "fotoBase64 vazio"
  | "fotoUrl invalida"
  | "arquivo inexistente"
  | "arquivo vazio"
  | "erro";

const prisma = new PrismaClient();
const UPLOAD_ROUTE_PREFIX = "/api/uploads";
const PUBLIC_UPLOAD_ROUTE_PREFIX = "/uploads";
const TEMPERATURE_FOLDER = "temperatura-equipamentos";
const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");
const CLEANUP_SAMPLE_LIMIT = 20;

function parseArgs(): { mode: Mode; dryRun: boolean; recordId: number | null } {
  const args = process.argv.slice(2);
  const mode: Mode = args.includes("limpar")
    ? "limpar"
    : args.includes("reparar")
      ? "reparar"
      : args.includes("diagnosticar")
        ? "diagnosticar"
      : "migrar";
  const dryRun = args.includes("--dry-run") || args.includes("dry-run");
  const recordIdArg = args.find((arg) => /^\d+$/.test(arg));
  const recordId = recordIdArg ? Number.parseInt(recordIdArg, 10) : null;

  return { mode, dryRun, recordId };
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

function getMimeTypeLabel(mimeType: ImageMimeType | null): string {
  if (!mimeType) {
    return "invalido/desconhecido";
  }

  if (mimeType === "image/jpeg") {
    return "JPEG";
  }

  if (mimeType === "image/png") {
    return "PNG";
  }

  return "WEBP";
}

function formatFirstBytes(buffer: Buffer, byteCount = 16): string {
  if (buffer.length === 0) {
    return "-";
  }

  return Array.from(buffer.subarray(0, byteCount))
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
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

async function saveImageAtResolvedPath(params: {
  uploadRoot: string;
  filePath: string;
  buffer: Buffer;
}): Promise<void> {
  assertPathInsideRoot(params.uploadRoot, params.filePath);
  await mkdir(path.dirname(params.filePath), { recursive: true });
  await writeFile(params.filePath, params.buffer);
}

function estimateTextBytes(value: string | null): number {
  return Buffer.byteLength(value ?? "", "utf8");
}

function decodePathSegments(value: string): string[] {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function assertSafeRelativeSegments(segments: string[]): void {
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\")
    )
  ) {
    throw new Error("fotoUrl possui caminho invalido");
  }
}

function resolveRelativeStoredPhotoPath(
  uploadRoot: string,
  relativePath: string,
  source: ResolvedStoredPhotoPath["source"]
): ResolvedStoredPhotoPath {
  const relativeSegments = decodePathSegments(relativePath);
  assertSafeRelativeSegments(relativeSegments);

  const filePath = path.resolve(uploadRoot, ...relativeSegments);
  assertPathInsideRoot(uploadRoot, filePath);

  return { filePath, source };
}

function resolveAbsoluteStoredPhotoPath(
  uploadRoot: string,
  storedPath: string
): ResolvedStoredPhotoPath {
  const decodedPath = decodeURIComponent(storedPath);
  const filePath = path.resolve(decodedPath);
  assertPathInsideRoot(uploadRoot, filePath);

  return { filePath, source: "absolute" };
}

function resolveStoredUploadPath(
  uploadRoot: string,
  fotoUrl: string
): ResolvedStoredPhotoPath {
  const trimmedUrl = fotoUrl.trim();
  if (!trimmedUrl) {
    throw new Error("fotoUrl vazia");
  }

  const parsedUrl = new URL(trimmedUrl, "http://local");
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith(`${UPLOAD_ROUTE_PREFIX}/`)) {
    return resolveRelativeStoredPhotoPath(
      uploadRoot,
      pathname.slice(UPLOAD_ROUTE_PREFIX.length + 1),
      "api-route"
    );
  }

  if (pathname.startsWith(`${PUBLIC_UPLOAD_ROUTE_PREFIX}/`)) {
    return resolveRelativeStoredPhotoPath(
      uploadRoot,
      pathname.slice(PUBLIC_UPLOAD_ROUTE_PREFIX.length + 1),
      "uploads-route"
    );
  }

  if (path.isAbsolute(trimmedUrl)) {
    return resolveAbsoluteStoredPhotoPath(uploadRoot, trimmedUrl);
  }

  return resolveRelativeStoredPhotoPath(uploadRoot, trimmedUrl, "relative");
}

function incrementReason(
  reasons: Map<IneligibleReason, number>,
  reason: IneligibleReason
): void {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
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

async function repairMissingPhotoFiles(dryRun: boolean): Promise<void> {
  const uploadRoot = getUploadRoot();
  const records = await prisma.controleTemperaturaEquipamento.findMany({
    where: {
      fotoBase64: { not: null },
      NOT: [{ fotoBase64: "" }, { fotoUrl: "" }],
      fotoUrl: { not: null }
    },
    select: {
      id: true,
      fotoBase64: true,
      fotoUrl: true,
      fotoMimeType: true,
      fotoTamanhoBytes: true
    },
    orderBy: { id: "asc" }
  });

  let existingFiles = 0;
  let missingFiles = 0;
  let wouldRecreate = 0;
  let recreated = 0;
  let errors = 0;
  let pendingReduction = 0;
  const recreatedIds: number[] = [];
  const failedIds: number[] = [];
  const pathsToCreateSamples: string[] = [];

  console.log(`Modo: reparar arquivos${dryRun ? " (dry-run)" : ""}`);
  console.log(`Diretorio de upload: ${uploadRoot}`);
  console.log(`Registros com fotoBase64 e fotoUrl: ${records.length}`);

  for (const record of records) {
    try {
      if (!record.fotoBase64?.trim() || !record.fotoUrl?.trim()) {
        continue;
      }

      pendingReduction += estimateTextBytes(record.fotoBase64);

      const resolvedPath = resolveStoredUploadPath(uploadRoot, record.fotoUrl);
      const existingFileStat = await stat(resolvedPath.filePath).catch(() => null);

      if (existingFileStat && existingFileStat.size > 0) {
        existingFiles += 1;
        continue;
      }

      missingFiles += 1;
      wouldRecreate += 1;

      if (pathsToCreateSamples.length < CLEANUP_SAMPLE_LIMIT) {
        pathsToCreateSamples.push(
          `- ID ${record.id}: ${record.fotoUrl} -> ${resolvedPath.filePath} (${resolvedPath.source})`
        );
      }

      if (dryRun) {
        continue;
      }

      const image = parseBase64Image(record.fotoBase64, record.fotoMimeType);
      await saveImageAtResolvedPath({
        uploadRoot,
        filePath: resolvedPath.filePath,
        buffer: image.buffer
      });

      const savedFileStat = await stat(resolvedPath.filePath);
      if (savedFileStat.size <= 0) {
        throw new Error("arquivo recriado ficou vazio");
      }
      const savedBuffer = await readFile(resolvedPath.filePath);
      const savedMimeType = detectMimeType(savedBuffer);
      if (!savedMimeType) {
        throw new Error("arquivo recriado nao possui assinatura JPG, PNG ou WEBP valida");
      }

      if (record.fotoTamanhoBytes !== savedFileStat.size) {
        await prisma.controleTemperaturaEquipamento.update({
          where: { id: record.id },
          data: { fotoTamanhoBytes: savedFileStat.size }
        });
      }

      recreated += 1;
      recreatedIds.push(record.id);
    } catch (error) {
      errors += 1;
      failedIds.push(record.id);
      console.error(
        `Falha ao reparar registro ${record.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log(`Caminhos fisicos que seriam criados (primeiros ${CLEANUP_SAMPLE_LIMIT}):`);
  if (pathsToCreateSamples.length === 0) {
    console.log("- nenhum");
  } else {
    for (const sample of pathsToCreateSamples) {
      console.log(sample);
    }
  }

  console.log("Resumo do reparo:");
  console.log(`- total com fotoBase64 e fotoUrl: ${records.length}`);
  console.log(`- arquivos existentes: ${existingFiles}`);
  console.log(`- arquivos ausentes: ${missingFiles}`);
  console.log(`- seriam recriados: ${wouldRecreate}`);
  if (dryRun) {
    console.log("- recriados: 0 (dry-run)");
    console.log("- nenhum dado alterado e nenhum arquivo criado.");
  } else {
    console.log(`- recriados: ${recreated}`);
  }
  console.log(`- reducao ainda nao aplicada: ${formatBytes(pendingReduction)}`);
  console.log(`- erros: ${errors}`);
  console.log(`- IDs recriados: ${recreatedIds.length ? recreatedIds.join(", ") : "-"}`);
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
  let ineligible = 0;
  let foundFile = 0;
  let missingFile = 0;
  let errors = 0;
  let estimatedReduction = 0;
  const failedIds: number[] = [];
  const ineligibleReasons = new Map<IneligibleReason, number>();
  const testedPathSamples: string[] = [];

  console.log(`Modo: limpar${dryRun ? " (dry-run)" : ""}`);
  console.log(`Diretorio de upload: ${uploadRoot}`);
  console.log(`Registros com base64 e fotoUrl: ${records.length}`);

  for (const record of records) {
    let resolvedPath: ResolvedStoredPhotoPath | null = null;

    try {
      if (!record.fotoUrl?.trim()) {
        ineligible += 1;
        incrementReason(ineligibleReasons, "fotoUrl vazia");
        if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
          testedPathSamples.push(
            `- ID ${record.id}: fotoUrl vazia | elegivel: nao | motivo: fotoUrl vazia`
          );
        }
        continue;
      }

      if (!record.fotoBase64?.trim()) {
        ineligible += 1;
        incrementReason(ineligibleReasons, "fotoBase64 vazio");
        if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
          testedPathSamples.push(
            `- ID ${record.id}: fotoUrl=${record.fotoUrl} | elegivel: nao | motivo: fotoBase64 vazio`
          );
        }
        continue;
      }

      try {
        resolvedPath = resolveStoredUploadPath(uploadRoot, record.fotoUrl);
      } catch (error) {
        ineligible += 1;
        incrementReason(ineligibleReasons, "fotoUrl invalida");
        if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
          testedPathSamples.push(
            `- ID ${record.id}: fotoUrl=${record.fotoUrl} | elegivel: nao | motivo: ${
              error instanceof Error ? error.message : "fotoUrl invalida"
            }`
          );
        }
        continue;
      }

      const fileStat = await stat(resolvedPath.filePath).catch(() => null);

      if (!fileStat) {
        ineligible += 1;
        missingFile += 1;
        incrementReason(ineligibleReasons, "arquivo inexistente");
        if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
          testedPathSamples.push(
            `- ID ${record.id}: ${record.fotoUrl} -> ${resolvedPath.filePath} (${resolvedPath.source}) | encontrado: nao | elegivel: nao | motivo: arquivo inexistente`
          );
        }
        continue;
      }

      foundFile += 1;

      if (fileStat.size <= 0) {
        ineligible += 1;
        incrementReason(ineligibleReasons, "arquivo vazio");
        if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
          testedPathSamples.push(
            `- ID ${record.id}: ${record.fotoUrl} -> ${resolvedPath.filePath} (${resolvedPath.source}) | encontrado: sim | tamanho: 0 B | elegivel: nao | motivo: arquivo vazio`
          );
        }
        continue;
      }

      eligible += 1;
      estimatedReduction += estimateTextBytes(record.fotoBase64);
      if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
        testedPathSamples.push(
          `- ID ${record.id}: ${record.fotoUrl} -> ${resolvedPath.filePath} (${resolvedPath.source}) | encontrado: sim | tamanho: ${formatBytes(fileStat.size)} | elegivel: sim`
        );
      }

      if (!dryRun) {
        await prisma.controleTemperaturaEquipamento.update({
          where: { id: record.id },
          data: { fotoBase64: null }
        });
      }

      cleaned += 1;
    } catch (error) {
      errors += 1;
      ineligible += 1;
      incrementReason(ineligibleReasons, "erro");
      failedIds.push(record.id);
      console.error(
        `Falha ao limpar registro ${record.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (dryRun && testedPathSamples.length < CLEANUP_SAMPLE_LIMIT) {
        testedPathSamples.push(
          `- ID ${record.id}: ${
            resolvedPath ? resolvedPath.filePath : record.fotoUrl ?? "-"
          } | elegivel: nao | motivo: erro`
        );
      }
    }
  }

  if (dryRun) {
    console.log(`Caminhos fisicos testados (primeiros ${CLEANUP_SAMPLE_LIMIT}):`);
    if (testedPathSamples.length === 0) {
      console.log("- nenhum registro testado");
    } else {
      for (const sample of testedPathSamples) {
        console.log(sample);
      }
    }
  }

  console.log("Resumo da limpeza:");
  console.log(`- total com fotoBase64 e fotoUrl: ${records.length}`);
  console.log(`- arquivos encontrados fisicamente: ${foundFile}`);
  console.log(`- arquivos nao encontrados: ${missingFile}`);
  console.log(`- elegiveis: ${eligible}`);
  console.log(`- nao elegiveis: ${ineligible}`);
  if (dryRun) {
    console.log(`- seriam limpos: ${eligible}`);
    console.log("- limpos: 0 (dry-run)");
  } else {
    console.log(`- limpos: ${cleaned}`);
  }
  console.log("- motivos dos nao elegiveis:");
  if (ineligibleReasons.size === 0) {
    console.log("  - nenhum");
  } else {
    for (const [reason, total] of ineligibleReasons.entries()) {
      console.log(`  - ${reason}: ${total}`);
    }
  }
  console.log(`- erros: ${errors}`);
  console.log(`- reducao estimada: ${formatBytes(estimatedReduction)}`);
  console.log(`- IDs com falha: ${failedIds.length ? failedIds.join(", ") : "-"}`);
}

async function diagnosePhotoRecord(recordId: number | null): Promise<void> {
  if (!recordId) {
    throw new Error(
      "Informe o ID do registro. Exemplo: npm run fotos:temperatura:diagnosticar -- 91"
    );
  }

  const uploadRoot = getUploadRoot();
  const record = await prisma.controleTemperaturaEquipamento.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      fotoBase64: true,
      fotoUrl: true,
      fotoMimeType: true,
      fotoTamanhoBytes: true
    }
  });

  if (!record) {
    throw new Error(`Registro ${recordId} nao encontrado.`);
  }

  const hasBase64 = Boolean(record.fotoBase64?.trim());
  const base64Bytes = estimateTextBytes(record.fotoBase64);
  let base64MimeType: ImageMimeType | null = null;
  let base64Error = "";

  if (record.fotoBase64?.trim()) {
    try {
      base64MimeType = parseBase64Image(record.fotoBase64, record.fotoMimeType).mimeType;
    } catch (error) {
      base64Error = error instanceof Error ? error.message : String(error);
    }
  }

  let resolvedPath: ResolvedStoredPhotoPath | null = null;
  let resolveError = "";
  let fileExists = false;
  let fileSize = 0;
  let firstBytes = "-";
  let fileMimeType: ImageMimeType | null = null;
  let fileReadError = "";

  if (record.fotoUrl?.trim()) {
    try {
      resolvedPath = resolveStoredUploadPath(uploadRoot, record.fotoUrl);
      const fileStat = await stat(resolvedPath.filePath).catch(() => null);
      fileExists = Boolean(fileStat);
      fileSize = fileStat?.size ?? 0;

      if (fileStat && fileStat.size > 0) {
        const fileBuffer = await readFile(resolvedPath.filePath);
        firstBytes = formatFirstBytes(fileBuffer);
        fileMimeType = detectMimeType(fileBuffer);
      }
    } catch (error) {
      if (resolvedPath) {
        fileReadError = error instanceof Error ? error.message : String(error);
      } else {
        resolveError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const shouldOpenByUrl = Boolean(fileExists && fileSize > 0 && fileMimeType);
  const shouldFallbackToBase64 = !shouldOpenByUrl && Boolean(base64MimeType);

  console.log("Diagnostico de foto de temperatura:");
  console.log(`- id: ${record.id}`);
  console.log(`- BPMA_UPLOAD_DIR resolvido: ${uploadRoot}`);
  console.log(`- fotoUrl: ${record.fotoUrl?.trim() || "-"}`);
  console.log(`- fotoBase64 existe: ${hasBase64 ? "sim" : "nao"}`);
  console.log(`- tamanho de fotoBase64: ${formatBytes(base64Bytes)}`);
  console.log(`- fotoMimeType no banco: ${record.fotoMimeType ?? "-"}`);
  console.log(`- fotoTamanhoBytes no banco: ${record.fotoTamanhoBytes ?? "-"}`);
  console.log(
    `- base64 parece imagem valida: ${base64MimeType ? `sim (${getMimeTypeLabel(base64MimeType)})` : "nao"}`
  );
  if (base64Error) {
    console.log(`- erro no base64: ${base64Error}`);
  }
  console.log(`- caminho fisico calculado: ${resolvedPath?.filePath ?? "-"}`);
  console.log(`- origem do caminho: ${resolvedPath?.source ?? "-"}`);
  if (resolveError) {
    console.log(`- erro ao resolver fotoUrl: ${resolveError}`);
  }
  console.log(`- arquivo existe: ${fileExists ? "sim" : "nao"}`);
  console.log(`- tamanho do arquivo: ${formatBytes(fileSize)}`);
  console.log(`- primeiros bytes do arquivo: ${firstBytes}`);
  console.log(
    `- arquivo parece imagem valida: ${fileMimeType ? `sim (${getMimeTypeLabel(fileMimeType)})` : "nao"}`
  );
  if (fileReadError) {
    console.log(`- erro ao ler arquivo: ${fileReadError}`);
  }
  console.log(`- deveria abrir por fotoUrl: ${shouldOpenByUrl ? "sim" : "nao"}`);
  console.log(
    `- deveria cair para fallback base64: ${shouldFallbackToBase64 ? "sim" : "nao"}`
  );
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
  const { mode, dryRun, recordId } = parseArgs();

  if (mode === "limpar") {
    await cleanMigratedBase64(dryRun);
    return;
  }

  if (mode === "diagnosticar") {
    await diagnosePhotoRecord(recordId);
    return;
  }

  if (mode === "reparar") {
    await repairMissingPhotoFiles(dryRun);
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
