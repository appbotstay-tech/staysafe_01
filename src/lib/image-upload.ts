import {
  MAX_IMAGE_UPLOAD_BYTES,
  UNSUPPORTED_IMAGE_FORMAT_MESSAGE,
  validateImageUploadFile
} from "@/lib/image-upload-rules";

type ParsedImageUpload = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  base64: string;
};

type ParseImageUploadParams = {
  formData: FormData;
  key: string;
  required?: boolean;
  requiredMessage?: string;
  maxBytes?: number;
};

export async function parseImageUploadFromFormData(
  params: ParseImageUploadParams
): Promise<ParsedImageUpload | null> {
  const value = params.formData.get(params.key);
  const required = params.required ?? false;
  const maxBytes = params.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES;

  if (!(value instanceof File) || value.size === 0) {
    if (required) {
      throw new Error(
        params.requiredMessage ??
          "Envie uma imagem para concluir esta operação."
      );
    }

    return null;
  }

  const validationMessage = validateImageUploadFile({
    name: value.name,
    size: value.size,
    type: value.type
  }, {
    maxBytes
  });

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  try {
    const buffer = Buffer.from(await value.arrayBuffer());

    return {
      fileName: value.name,
      mimeType: value.type || "image/jpeg",
      size: buffer.byteLength,
      buffer,
      base64: buffer.toString("base64")
    };
  } catch {
    throw new Error(
      `Não foi possível salvar a foto. Tente novamente ou selecione outra imagem. ${UNSUPPORTED_IMAGE_FORMAT_MESSAGE}`
    );
  }
}

export function getImageDataUrl(mimeType: string | null, base64: string | null): string | null {
  if (!mimeType || !base64) {
    return null;
  }

  return `data:${mimeType};base64,${base64}`;
}

export function getStoredImageSrc(params: {
  url?: string | null;
  mimeType?: string | null;
  base64?: string | null;
}): string | null {
  const url = params.url?.trim();

  if (url) {
    return url;
  }

  return getImageDataUrl(params.mimeType ?? null, params.base64 ?? null);
}

export function hasStoredImage(params: {
  url?: string | null;
  mimeType?: string | null;
  base64?: string | null;
}): boolean {
  return Boolean(
    params.url?.trim() ||
      ((params.mimeType?.trim() ?? "") && (params.base64?.trim() ?? ""))
  );
}
