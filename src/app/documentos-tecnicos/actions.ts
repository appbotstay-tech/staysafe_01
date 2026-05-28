"use server";

import { DocumentoTipo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rethrowIfRedirectError } from "@/lib/redirect-error";
import { getCurrentUserForAction } from "@/lib/auth-session";
import { ensureCanManageTechnicalDocuments } from "@/lib/authz";
import {
  DOCUMENTO_MODULO_OPTIONS,
  parseDocumentoTipo,
  parseModuloDocumento
} from "@/lib/documentos-tecnicos";
import { parseAppDateInput } from "@/lib/date-time";
import { parsePdfUploadFromFormData } from "@/lib/pdf-upload";
import { prisma } from "@/lib/prisma";

const MODULE_PATH = "/documentos-tecnicos";

type FeedbackType = "success" | "error";

function getInputValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getReturnToPath(formData: FormData): string {
  const value = getInputValue(formData, "returnTo");

  if (!value.startsWith(MODULE_PATH)) {
    return MODULE_PATH;
  }

  return value;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const technicalPattern =
      /next_redirect|invalid `prisma|prismaclient|typeerror|referenceerror|syntaxerror|p20\d{2}|stack/i;
    if (technicalPattern.test(error.message)) {
      return fallback;
    }
    return error.message;
  }

  return fallback;
}

function redirectWithFeedback(
  returnTo: string,
  feedbackType: FeedbackType,
  feedback: string
): never {
  const url = new URL(returnTo, "http://localhost");
  if (feedbackType === "success") {
    url.searchParams.delete("new");
    url.searchParams.delete("editId");
    url.searchParams.delete("deleteId");
  }
  url.searchParams.set("feedbackType", feedbackType);
  url.searchParams.set("feedback", feedback);

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

function revalidateDocumentoPaths() {
  revalidatePath(MODULE_PATH);
  for (const option of DOCUMENTO_MODULO_OPTIONS) {
    if (option.href) {
      revalidatePath(option.href);
    }
  }
}

function sanitizeText(value: string, maxLength = 1000): string | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function getDocumentoPayload(formData: FormData) {
  const aplicacaoDocumento = getInputValue(formData, "aplicacaoDocumento");
  const todosModulos = aplicacaoDocumento === "TODOS_MODULOS";
  const modulo = todosModulos ? null : parseModuloDocumento(getInputValue(formData, "modulo"));
  const tipo = parseDocumentoTipo(getInputValue(formData, "tipo"));
  const nome = sanitizeText(getInputValue(formData, "nome"), 180);
  const observacoes = sanitizeText(getInputValue(formData, "observacoes"), 2000);
  const ativo = getInputValue(formData, "ativo") !== "false";

  if (!todosModulos && !modulo) {
    throw new Error("Selecione um módulo relacionado válido.");
  }

  if (!tipo) {
    throw new Error("Selecione um tipo de documento válido.");
  }

  if (!nome) {
    throw new Error("Informe o nome/título do documento.");
  }

  let legislacaoResumo: string | null = null;
  let dataEmissao: Date | null = null;
  let dataValidade: Date | null = null;

  if (tipo === DocumentoTipo.LEGISLACAO) {
    legislacaoResumo = sanitizeText(getInputValue(formData, "legislacaoResumo"), 500);
    if (!legislacaoResumo) {
      throw new Error("Informe o texto/resumo da legislação para o cabeçalho.");
    }
  }

  if (tipo === DocumentoTipo.LAUDO) {
    dataEmissao = parseAppDateInput(getInputValue(formData, "dataEmissao"));
    dataValidade = parseAppDateInput(getInputValue(formData, "dataValidade"));

    if (!dataEmissao || !dataValidade) {
      throw new Error("Informe a data de emissão e a data de validade do documento.");
    }
  }

  return {
    modulo,
    todosModulos,
    tipo,
    nome,
    legislacaoResumo,
    dataEmissao,
    dataValidade,
    observacoes,
    ativo
  };
}

export async function createDocumentoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageTechnicalDocuments(actor);

    const payload = getDocumentoPayload(formData);
    const arquivoPdf = await parsePdfUploadFromFormData({
      formData,
      key: "arquivoPdf",
      required: true,
      requiredMessage: "Envie um PDF para cadastrar o documento técnico."
    });

    if (!arquivoPdf) {
      throw new Error("Envie um PDF para cadastrar o documento técnico.");
    }

    await prisma.documentoTecnicoAnexo.create({
      data: {
        ...payload,
        arquivoNome: arquivoPdf.fileName,
        arquivoMimeType: arquivoPdf.mimeType,
        arquivoTamanho: arquivoPdf.size,
        arquivoConteudo: arquivoPdf.content,
        criadoPorUsuarioId: actor.id
      }
    });

    revalidateDocumentoPaths();
    redirectWithFeedback(returnTo, "success", "Documento cadastrado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível cadastrar o documento. Verifique os campos.")
    );
  }
}

export async function updateDocumentoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageTechnicalDocuments(actor);

    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Documento inválido para edição.");
    }

    const existing = await prisma.documentoTecnicoAnexo.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new Error("Documento não encontrado.");
    }

    const payload = getDocumentoPayload(formData);
    const arquivoPdf = await parsePdfUploadFromFormData({
      formData,
      key: "arquivoPdf"
    });

    await prisma.documentoTecnicoAnexo.update({
      where: { id },
      data: {
        ...payload,
        ...(arquivoPdf
          ? {
              arquivoNome: arquivoPdf.fileName,
              arquivoMimeType: arquivoPdf.mimeType,
              arquivoTamanho: arquivoPdf.size,
              arquivoConteudo: arquivoPdf.content
            }
          : {})
      }
    });

    revalidateDocumentoPaths();
    redirectWithFeedback(returnTo, "success", "Documento atualizado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar o documento. Verifique os campos.")
    );
  }
}

export async function toggleDocumentoStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageTechnicalDocuments(actor);

    const id = parsePositiveInt(getInputValue(formData, "id"));
    const ativo = getInputValue(formData, "ativo") === "true";
    if (!id) {
      throw new Error("Documento inválido para atualização.");
    }

    await prisma.documentoTecnicoAnexo.update({
      where: { id },
      data: { ativo }
    });

    revalidateDocumentoPaths();
    redirectWithFeedback(
      returnTo,
      "success",
      ativo ? "Documento ativado com sucesso." : "Documento inativado com sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível alterar o status do documento.")
    );
  }
}

export async function deleteDocumentoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageTechnicalDocuments(actor);

    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Documento inválido para exclusão.");
    }

    await prisma.documentoTecnicoAnexo.delete({
      where: { id }
    });

    revalidateDocumentoPaths();
    redirectWithFeedback(returnTo, "success", "Documento excluído com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível excluir o documento.")
    );
  }
}
