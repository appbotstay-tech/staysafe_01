export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_PDF_MIME_TYPES = ["application/pdf"] as const;

export const PDF_UPLOAD_ACCEPT_ATTRIBUTE = "application/pdf,.pdf";

export const UNSUPPORTED_PDF_FORMAT_MESSAGE = "Envie apenas arquivos em PDF.";

export const PDF_TOO_LARGE_MESSAGE =
  "O arquivo selecionado é muito grande. Envie um PDF com até 10 MB.";

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

export function isAcceptedPdfFile(file: { name: string; type: string }): boolean {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  return (
    ACCEPTED_PDF_MIME_TYPES.includes(
      mimeType as (typeof ACCEPTED_PDF_MIME_TYPES)[number]
    ) || extension === "pdf"
  );
}

export function validatePdfUploadFile(file: {
  name: string;
  size: number;
  type: string;
}): string {
  if (!isAcceptedPdfFile(file)) {
    return UNSUPPORTED_PDF_FORMAT_MESSAGE;
  }

  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return PDF_TOO_LARGE_MESSAGE;
  }

  return "";
}
