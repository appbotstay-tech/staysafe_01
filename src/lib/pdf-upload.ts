import {
  MAX_PDF_UPLOAD_BYTES,
  UNSUPPORTED_PDF_FORMAT_MESSAGE,
  validatePdfUploadFile
} from "@/lib/pdf-upload-rules";

type ParsedPdfUpload = {
  fileName: string;
  mimeType: string;
  size: number;
  content: Buffer;
};

type ParsePdfUploadParams = {
  formData: FormData;
  key: string;
  required?: boolean;
  requiredMessage?: string;
  maxBytes?: number;
};

export async function parsePdfUploadFromFormData(
  params: ParsePdfUploadParams
): Promise<ParsedPdfUpload | null> {
  const value = params.formData.get(params.key);
  const required = params.required ?? false;
  const maxBytes = params.maxBytes ?? MAX_PDF_UPLOAD_BYTES;

  if (!(value instanceof File) || value.size === 0) {
    if (required) {
      throw new Error(params.requiredMessage ?? "Envie um PDF para concluir esta operação.");
    }

    return null;
  }

  const validationMessage = validatePdfUploadFile({
    name: value.name,
    size: value.size,
    type: value.type
  });

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  if (value.size > maxBytes) {
    throw new Error("O arquivo selecionado é muito grande. Envie um PDF com até 10 MB.");
  }

  try {
    const buffer = Buffer.from(await value.arrayBuffer());

    return {
      fileName: value.name,
      mimeType: "application/pdf",
      size: value.size,
      content: buffer
    };
  } catch {
    throw new Error(
      `Não foi possível salvar o PDF. Tente novamente ou selecione outro arquivo. ${UNSUPPORTED_PDF_FORMAT_MESSAGE}`
    );
  }
}
