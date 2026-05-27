export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

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
}): string {
  if (!isAcceptedImageFile(file)) {
    return UNSUPPORTED_IMAGE_FORMAT_MESSAGE;
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return IMAGE_TOO_LARGE_MESSAGE;
  }

  return "";
}
