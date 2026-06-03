export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const TEMPERATURE_EVIDENCE_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const TEMPERATURE_EVIDENCE_IMAGE_TARGET_BYTES = 600 * 1024;
export const TEMPERATURE_EVIDENCE_IMAGE_MAX_WIDTH = 1280;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const IMAGE_UPLOAD_ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const UNSUPPORTED_IMAGE_FORMAT_MESSAGE =
  "Formato de imagem não suportado. Selecione uma imagem JPG, PNG ou WEBP.";

export const IMAGE_TOO_LARGE_MESSAGE =
  "A foto selecionada é muito grande. Envie uma imagem menor.";

function formatBytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

export function getImageTooLargeMessage(maxBytes = MAX_IMAGE_UPLOAD_BYTES): string {
  return `A foto selecionada é muito grande. Envie uma imagem de até ${formatBytes(maxBytes)}.`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

export function isAcceptedImageFile(file: { name: string; type: string }): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (
    ACCEPTED_IMAGE_MIME_TYPES.includes(
      mimeType as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return true;
  }

  return ACCEPTED_IMAGE_EXTENSIONS.includes(
    extension as (typeof ACCEPTED_IMAGE_EXTENSIONS)[number]
  );
}

export function validateImageUploadFile(file: {
  name: string;
  size: number;
  type: string;
}, options: { maxBytes?: number } = {}): string {
  if (!isAcceptedImageFile(file)) {
    return UNSUPPORTED_IMAGE_FORMAT_MESSAGE;
  }

  const maxBytes = options.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES;

  if (file.size > maxBytes) {
    return getImageTooLargeMessage(maxBytes);
  }

  return "";
}
