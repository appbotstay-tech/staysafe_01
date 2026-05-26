"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserForAction } from "@/lib/auth-session";
import { ensureCanAccessValidityLabels } from "@/lib/authz";
import {
  formatAppDateInput,
  getAppDate,
  parseAppDateInput
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { rethrowIfRedirectError } from "@/lib/redirect-error";

import { HISTORY_PATH, MODULE_PATH, OPTIONS_PATH, UNIT_OPTIONS } from "./constants";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type FeedbackType = "success" | "error";

function getInputValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function sanitizeText(value: string, maxLength = 1000): string | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function parseOptionalTime(value: string): string | null {
  if (!value) {
    return null;
  }

  if (!TIME_PATTERN.test(value)) {
    throw new Error("Informe um horário válido.");
  }

  return value;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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
  feedback: string,
  extraParams?: Record<string, string>
): never {
  const url = new URL(returnTo, "http://localhost");
  if (feedbackType === "success") {
    url.searchParams.delete("editClassificacaoId");
    url.searchParams.delete("editItemId");
    url.searchParams.delete("etiquetaId");
  }
  url.searchParams.set("feedbackType", feedbackType);
  url.searchParams.set("feedback", feedback);

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

async function ensureDevAction() {
  const actor = await getCurrentUserForAction();
  ensureCanAccessValidityLabels(actor.perfil);
  return actor;
}

async function ensureDevDeletionAction() {
  const actor = await getCurrentUserForAction();

  if (actor.perfil !== "DEV") {
    throw new Error("Apenas usuários DEV podem executar esta ação.");
  }

  return actor;
}

function formatEtiquetaCode(id: number): string {
  return `STS-${String(id).padStart(6, "0")}`;
}

function revalidateEtiquetaPaths() {
  revalidatePath(MODULE_PATH);
  revalidatePath(OPTIONS_PATH);
  revalidatePath(HISTORY_PATH);
}

function getClassificacaoPayload(formData: FormData) {
  const nome = sanitizeText(getInputValue(formData, "nome"), 120);
  const validadeDias = parsePositiveInt(getInputValue(formData, "validadeDias"));
  const descricao = sanitizeText(getInputValue(formData, "descricao"), 1000);
  const ativo = getInputValue(formData, "ativo") !== "false";

  if (!nome) {
    throw new Error("Informe o nome da classificação.");
  }

  if (!validadeDias) {
    throw new Error("Informe a validade em dias, maior que zero.");
  }

  return {
    nome,
    validadeDias,
    descricao,
    ativo
  };
}

function getItemPayload(formData: FormData) {
  const nome = sanitizeText(getInputValue(formData, "nome"), 160);
  const classificacaoId = parsePositiveInt(getInputValue(formData, "classificacaoId"));
  const unidadeMedidaPadrao = sanitizeText(
    getInputValue(formData, "unidadeMedidaPadrao"),
    40
  );
  const observacao = sanitizeText(getInputValue(formData, "observacao"), 1000);
  const ativo = getInputValue(formData, "ativo") !== "false";

  if (!nome) {
    throw new Error("Informe o nome do item/produto.");
  }

  if (!classificacaoId) {
    throw new Error("Selecione uma classificação ativa para o item.");
  }

  if (
    !unidadeMedidaPadrao ||
    !(UNIT_OPTIONS as readonly string[]).includes(unidadeMedidaPadrao)
  ) {
    throw new Error("Selecione a unidade de medida padrão do item.");
  }

  return {
    nome,
    classificacaoId,
    unidadeMedidaPadrao,
    observacao,
    ativo
  };
}

export async function createClassificacaoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const payload = getClassificacaoPayload(formData);

    await prisma.etiquetaValidadeClassificacao.create({
      data: payload
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Classificação cadastrada com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível cadastrar a classificação.")
    );
  }
}

export async function updateClassificacaoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Classificação inválida para edição.");
    }

    const payload = getClassificacaoPayload(formData);
    await prisma.etiquetaValidadeClassificacao.update({
      where: { id },
      data: payload
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Classificação atualizada com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar a classificação.")
    );
  }
}

export async function toggleClassificacaoStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Classificação inválida para atualização.");
    }

    const existing = await prisma.etiquetaValidadeClassificacao.findUnique({
      where: { id },
      select: { ativo: true }
    });
    if (!existing) {
      throw new Error("Classificação não encontrada.");
    }

    await prisma.etiquetaValidadeClassificacao.update({
      where: { id },
      data: { ativo: !existing.ativo }
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Status da classificação atualizado.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar a classificação.")
    );
  }
}

export async function deleteClassificacaoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevDeletionAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Classificação inválida para exclusão.");
    }

    const [itensVinculados, etiquetasVinculadas] = await Promise.all([
      prisma.etiquetaValidadeItem.count({ where: { classificacaoId: id } }),
      prisma.etiquetaValidadeGerada.count({ where: { classificacaoId: id } })
    ]);

    if (itensVinculados > 0) {
      throw new Error(
        "Não é possível excluir esta classificação porque existem itens vinculados a ela. Exclua ou altere os itens antes."
      );
    }

    if (etiquetasVinculadas > 0) {
      throw new Error(
        "Não é possível excluir esta classificação porque existem etiquetas geradas vinculadas a ela."
      );
    }

    await prisma.etiquetaValidadeClassificacao.delete({ where: { id } });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Classificação excluída com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível excluir a classificação.")
    );
  }
}

export async function createItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const payload = getItemPayload(formData);
    const classificacao = await prisma.etiquetaValidadeClassificacao.findUnique({
      where: { id: payload.classificacaoId },
      select: { ativo: true }
    });

    if (!classificacao?.ativo) {
      throw new Error("Selecione uma classificação ativa para o item.");
    }

    await prisma.etiquetaValidadeItem.create({
      data: payload
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Item cadastrado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível cadastrar o item.")
    );
  }
}

export async function updateItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Item inválido para edição.");
    }

    const payload = getItemPayload(formData);
    const classificacao = await prisma.etiquetaValidadeClassificacao.findUnique({
      where: { id: payload.classificacaoId },
      select: { ativo: true }
    });

    if (!classificacao?.ativo) {
      throw new Error("Selecione uma classificação ativa para o item.");
    }

    await prisma.etiquetaValidadeItem.update({
      where: { id },
      data: payload
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Item atualizado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar o item.")
    );
  }
}

export async function toggleItemStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Item inválido para atualização.");
    }

    const existing = await prisma.etiquetaValidadeItem.findUnique({
      where: { id },
      select: { ativo: true }
    });
    if (!existing) {
      throw new Error("Item não encontrado.");
    }

    await prisma.etiquetaValidadeItem.update({
      where: { id },
      data: { ativo: !existing.ativo }
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Status do item atualizado.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar o item.")
    );
  }
}

export async function deleteItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevDeletionAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Item inválido para exclusão.");
    }

    const etiquetasVinculadas = await prisma.etiquetaValidadeGerada.count({
      where: { itemId: id }
    });
    if (etiquetasVinculadas > 0) {
      await prisma.etiquetaValidadeItem.update({
        where: { id },
        data: { ativo: false }
      });

      revalidateEtiquetaPaths();
      redirectWithFeedback(
        returnTo,
        "success",
        "Este item possui etiquetas geradas. Ele foi inativado para preservar o histórico."
      );
    }

    await prisma.etiquetaValidadeItem.delete({ where: { id } });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Item excluído com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível excluir o item.")
    );
  }
}

export async function deleteEtiquetaGeradaAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevDeletionAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Etiqueta inválida para exclusão.");
    }

    await prisma.etiquetaValidadeGerada.delete({ where: { id } });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Etiqueta gerada excluída do histórico.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível excluir a etiqueta gerada.")
    );
  }
}

export async function updatePrintConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    await ensureDevAction();
    const larguraMm = parsePositiveNumber(getInputValue(formData, "larguraMm"));
    const alturaMm = parsePositiveNumber(getInputValue(formData, "alturaMm"));
    const margemMm = parsePositiveNumber(getInputValue(formData, "margemMm"));
    const tamanhoFonte = parsePositiveNumber(getInputValue(formData, "tamanhoFonte"));

    if (!larguraMm || !alturaMm || !margemMm || !tamanhoFonte) {
      throw new Error("Informe medidas e fonte com valores maiores que zero.");
    }

    await prisma.etiquetaValidadeConfiguracaoImpressao.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        larguraMm,
        alturaMm,
        margemMm,
        tamanhoFonte,
        mostrarQrCode: getInputValue(formData, "mostrarQrCode") === "on",
        mostrarSif: getInputValue(formData, "mostrarSif") === "on",
        mostrarLote: getInputValue(formData, "mostrarLote") === "on",
        mostrarMarcaFornecedor:
          getInputValue(formData, "mostrarMarcaFornecedor") === "on"
      },
      update: {
        larguraMm,
        alturaMm,
        margemMm,
        tamanhoFonte,
        mostrarQrCode: getInputValue(formData, "mostrarQrCode") === "on",
        mostrarSif: getInputValue(formData, "mostrarSif") === "on",
        mostrarLote: getInputValue(formData, "mostrarLote") === "on",
        mostrarMarcaFornecedor:
          getInputValue(formData, "mostrarMarcaFornecedor") === "on"
      }
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(returnTo, "success", "Configuração de impressão atualizada.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível atualizar a configuração de impressão.")
    );
  }
}

export async function generateEtiquetaAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await ensureDevAction();
    if (!actor.nomeCompleto.trim()) {
      throw new Error("Responsável obrigatório para gerar etiqueta.");
    }

    const itemId = parsePositiveInt(getInputValue(formData, "itemId"));
    if (!itemId) {
      throw new Error("Selecione um item/produto ativo.");
    }

    const dataManipulacao =
      parseAppDateInput(getInputValue(formData, "dataManipulacao")) ?? getAppDate();
    const horaManipulacao = parseOptionalTime(getInputValue(formData, "horaManipulacao"));
    const horaValidade = parseOptionalTime(getInputValue(formData, "horaValidade"));
    const quantidade = sanitizeText(getInputValue(formData, "quantidade"), 80);
    const marcaFornecedorManual = sanitizeText(
      getInputValue(formData, "marcaFornecedor"),
      160
    );
    const sif = sanitizeText(getInputValue(formData, "sif"), 40);
    const lote = sanitizeText(getInputValue(formData, "lote"), 80);
    const observacao = sanitizeText(getInputValue(formData, "observacao"), 1000);

    if (!quantidade) {
      throw new Error("Informe a quantidade/gramatura da etiqueta.");
    }

    const item = await prisma.etiquetaValidadeItem.findUnique({
      where: { id: itemId },
      include: { classificacao: true }
    });

    if (!item || !item.ativo) {
      throw new Error("Não é possível gerar etiqueta para item inativo ou inexistente.");
    }

    if (!item.classificacao.ativo) {
      throw new Error("Não é possível gerar etiqueta com classificação inativa.");
    }

    if (!item.classificacao.validadeDias || item.classificacao.validadeDias <= 0) {
      throw new Error(
        "Classificação sem validade configurada. Cadastre a validade antes de gerar a etiqueta."
      );
    }

    const dataValidade = addDays(dataManipulacao, item.classificacao.validadeDias);
    const marcaFornecedorSnapshot = marcaFornecedorManual;

    const etiqueta = await prisma.$transaction(async (tx) => {
      const created = await tx.etiquetaValidadeGerada.create({
        data: {
          itemId: item.id,
          nomeItemSnapshot: item.nome,
          classificacaoId: item.classificacaoId,
          nomeClassificacaoSnapshot: item.classificacao.nome,
          validadeDiasSnapshot: item.classificacao.validadeDias,
          dataManipulacao,
          horaManipulacao,
          dataValidade,
          horaValidade,
          responsavelUsuarioId: actor.id,
          responsavelNomeSnapshot: actor.nomeCompleto,
          marcaFornecedorSnapshot,
          sif,
          lote,
          quantidade,
          unidadeMedidaSnapshot: item.unidadeMedidaPadrao,
          observacao,
          codigoEtiqueta: `STS-TMP-${actor.id}-${Date.now()}`
        }
      });

      return tx.etiquetaValidadeGerada.update({
        where: { id: created.id },
        data: { codigoEtiqueta: formatEtiquetaCode(created.id) }
      });
    });

    revalidateEtiquetaPaths();
    redirectWithFeedback(
      returnTo,
      "success",
      `Etiqueta ${etiqueta.codigoEtiqueta} gerada com validade em ${formatAppDateInput(
        etiqueta.dataValidade
      )}.`,
      { etiquetaId: String(etiqueta.id) }
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível gerar a etiqueta.")
    );
  }
}
