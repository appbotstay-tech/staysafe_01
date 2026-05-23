"use server";

import {
  Prisma,
  StatusFechamentoPlanoLimpeza,
  StatusPlanoLimpeza,
  TipoPlanoLimpeza
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rethrowIfRedirectError } from "@/lib/redirect-error";

import { getCurrentUserForAction } from "@/lib/auth-session";
import {
  createSignatureLog,
  ensureCanCloseMonth,
  ensureCanManageOptions,
  ensureCanReopenMonth,
  ensureCanSignResponsible,
  ensureCanSignSupervisor,
  validateSignaturePassword
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";

import {
  buildDailyTurnoFlags,
  consolidateWeeklyExecutionsByAreaWeek,
  ensureDailyTurnoSelection,
  ensureWeeklyChecklistForDateRange,
  getDailySignStage,
  getWeeklySignStage
} from "./service";
import {
  getCurrentSystemDateTime,
  getMonthDateRange,
  getMonthYear,
  parseDateInput,
  formatWeeklySignatureDateTime,
  parsePositiveInt
} from "./utils";

const MODULE_PATH = "/plano-limpeza";
const DIARIO_PATH = "/plano-limpeza/diario";
const DIARIO_HISTORY_PATH = "/plano-limpeza/diario/historico";
const DIARIO_OPCOES_PATH = "/plano-limpeza/diario/opcoes";
const SEMANAL_PATH = "/plano-limpeza/semanal";
const SEMANAL_HISTORY_PATH = "/plano-limpeza/semanal/historico";
const SEMANAL_OPCOES_PATH = "/plano-limpeza/semanal/opcoes";

type FeedbackType = "success" | "error";
type ActionUser = Awaited<ReturnType<typeof getCurrentUserForAction>>;
const SELF_SUPERVISION_MESSAGE =
  "Quem executou o serviço não pode assinar como supervisor. Solicite a assinatura de outro responsável autorizado.";

function getInputValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getReturnToPath(formData: FormData, fallbackPath: string): string {
  const value = getInputValue(formData, "returnTo");

  if (!value.startsWith(MODULE_PATH)) {
    return fallbackPath;
  }

  return value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    const technicalPattern =
      /next_redirect|invalid `prisma|prismaclient|typeerror|referenceerror|syntaxerror|p20\d{2}|stack/i;
    if (technicalPattern.test(error.message)) {
      return "Não foi possível processar a operação.";
    }
    return error.message;
  }

  return "Não foi possível processar a operação.";
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
    url.searchParams.delete("editAreaId");
    url.searchParams.delete("editDailyItemId");
    url.searchParams.delete("editItemId");
    url.searchParams.delete("editWeeklyAreaId");
    url.searchParams.delete("deleteAreaId");
    url.searchParams.delete("deleteDailyItemId");
    url.searchParams.delete("deleteItemId");
    url.searchParams.delete("deleteWeeklyAreaId");
    [
      "nome",
      "detalhamentoLimpeza",
      "ordem",
      "ativo",
      "turnoManha",
      "turnoTarde",
      "turnoNoite",
      "areaId",
      "descricao",
      "produtoUtilizado",
      "funcionarioResponsavel",
      "area",
      "oQueLimpar",
      "qualProduto",
      "setorResponsavel",
      "quem"
    ].forEach((key) => url.searchParams.delete(key));
  }
  url.searchParams.set("feedbackType", feedbackType);
  url.searchParams.set("feedback", feedback);

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

function buildDailyAreaConfigErrorReturnTo(returnTo: string, formData: FormData): string {
  const url = new URL(returnTo, "http://localhost");
  const areaId = getInputValue(formData, "areaId");
  if (areaId) {
    url.searchParams.set("editAreaId", areaId);
  }

  for (const key of ["nome", "detalhamentoLimpeza", "ordem", "ativo"]) {
    url.searchParams.set(key, getInputValue(formData, key));
  }

  for (const key of ["turnoManha", "turnoTarde", "turnoNoite"]) {
    url.searchParams.set(key, formData.get(key) === "on" ? "true" : "false");
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function buildDailyItemConfigErrorReturnTo(returnTo: string, formData: FormData): string {
  const url = new URL(returnTo, "http://localhost");
  const itemId = getInputValue(formData, "dailyItemId");
  if (itemId) {
    url.searchParams.set("editDailyItemId", itemId);
  }

  for (const key of [
    "areaId",
    "descricao",
    "produtoUtilizado",
    "setorResponsavel",
    "funcionarioResponsavel",
    "ordem",
    "ativo"
  ]) {
    url.searchParams.set(key, getInputValue(formData, key));
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function buildWeeklyConfigItemErrorReturnTo(returnTo: string, formData: FormData): string {
  const url = new URL(returnTo, "http://localhost");
  const itemId = getInputValue(formData, "itemId");
  if (itemId) {
    url.searchParams.set("editItemId", itemId);
  }

  for (const key of [
    "area",
    "ordem",
    "oQueLimpar",
    "qualProduto",
    "setorResponsavel",
    "quem",
    "ativo"
  ]) {
    url.searchParams.set(key, getInputValue(formData, key));
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function buildWeeklyAreaErrorReturnTo(returnTo: string, formData: FormData): string {
  const url = new URL(returnTo, "http://localhost");
  const areaId = getInputValue(formData, "weeklyAreaId");
  if (areaId) {
    url.searchParams.set("editWeeklyAreaId", areaId);
  }

  for (const key of ["nome", "ordem", "ativo"]) {
    url.searchParams.set(key, getInputValue(formData, key));
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function revalidateModulePaths() {
  revalidatePath(MODULE_PATH);
  revalidatePath(DIARIO_PATH);
  revalidatePath(DIARIO_HISTORY_PATH);
  revalidatePath(DIARIO_OPCOES_PATH);
  revalidatePath(SEMANAL_PATH);
  revalidatePath(SEMANAL_HISTORY_PATH);
  revalidatePath(SEMANAL_OPCOES_PATH);
}

async function isMonthSigned(tipo: TipoPlanoLimpeza, mes: number, ano: number): Promise<boolean> {
  const fechamento = await prisma.planoLimpezaFechamento.findUnique({
    where: { tipo_mes_ano: { tipo, mes, ano } }
  });

  return fechamento?.status === StatusFechamentoPlanoLimpeza.ASSINADO;
}

function ensureNonEmpty(value: string, label: string) {
  if (!value) {
    throw new Error(`O campo ${label} é obrigatório.`);
  }
}

function isSameResponsibleUser(
  record: {
    assinaturaResponsavel: string;
    assinaturaResponsavelUsuarioId?: number | null;
  },
  actor: ActionUser
): boolean {
  if (record.assinaturaResponsavelUsuarioId !== null && record.assinaturaResponsavelUsuarioId !== undefined) {
    return record.assinaturaResponsavelUsuarioId === actor.id;
  }

  return record.assinaturaResponsavel.trim() === actor.nomeCompleto.trim();
}

async function ensureWeeklyAreaName(value: string): Promise<string> {
  ensureNonEmpty(value, "Área");

  const area = await prisma.planoLimpezaSemanalArea.findUnique({
    where: { nome: value }
  });

  if (!area || area.excluidoEm) {
    throw new Error("Selecione uma área semanal cadastrada.");
  }

  if (!area.ativo) {
    throw new Error("A área semanal selecionada está inativa.");
  }

  return area.nome;
}

export async function updateDailyRecordAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_PATH);

  try {
    const actor = await getCurrentUserForAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Registro diário inválido para edição.");
    }

    const existing = await prisma.planoLimpezaDiarioRegistro.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error("Registro diário não encontrado.");
    }

    const period = getMonthYear(existing.data);
    if (await isMonthSigned(TipoPlanoLimpeza.DIARIO, period.mes, period.ano)) {
      throw new Error("Este registro pertence a um período fechado e não pode ser alterado.");
    }

    const etapa = getInputValue(formData, "etapa");
    const senhaConfirmacao = getInputValue(formData, "senhaConfirmacao");
    const observacaoAssinatura = getInputValue(formData, "observacaoAssinatura");

    const etapaPermitida = getDailySignStage(existing);
    if (!etapaPermitida) {
      throw new Error("Este checklist não está disponível para nova assinatura.");
    }

    if (etapa !== etapaPermitida) {
      throw new Error("A etapa de assinatura informada é inválida para este checklist.");
    }

    await validateSignaturePassword({ user: actor, password: senhaConfirmacao });

    if (etapaPermitida === "responsavel") {
      ensureCanSignResponsible(actor.perfil);
      const signedAt = getCurrentSystemDateTime();

      await prisma.planoLimpezaDiarioRegistro.update({
        where: { id },
        data: {
          assinaturaResponsavel: actor.nomeCompleto,
          assinaturaResponsavelUsuarioId: actor.id,
          assinaturaResponsavelNomeUsuario: actor.nomeUsuario,
          assinaturaResponsavelPerfil: actor.perfil,
          assinaturaResponsavelDataHora: signedAt,
          status: StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR,
          observacaoResponsavel: observacaoAssinatura || null
        }
      });
      await createSignatureLog({
        user: actor,
        tipo: "RESPONSAVEL",
        modulo: "plano-limpeza/diario",
        referenciaId: String(id),
        observacao: observacaoAssinatura || null
      });
    } else {
      ensureCanSignSupervisor(actor.perfil);
      if (!existing.assinaturaResponsavel) {
        throw new Error("A assinatura do responsável é obrigatória antes da assinatura do supervisor.");
      }
      if (isSameResponsibleUser(existing, actor)) {
        throw new Error(SELF_SUPERVISION_MESSAGE);
      }
      const signedAt = getCurrentSystemDateTime();

      await prisma.planoLimpezaDiarioRegistro.update({
        where: { id },
        data: {
          assinaturaSupervisor: actor.nomeCompleto,
          assinaturaSupervisorUsuarioId: actor.id,
          assinaturaSupervisorNomeUsuario: actor.nomeUsuario,
          assinaturaSupervisorPerfil: actor.perfil,
          assinaturaSupervisorDataHora: signedAt,
          status: StatusPlanoLimpeza.CONCLUIDO,
          observacaoSupervisor: observacaoAssinatura || null
        }
      });
      await createSignatureLog({
        user: actor,
        tipo: "SUPERVISOR",
        modulo: "plano-limpeza/diario",
        referenciaId: String(id),
        observacao: observacaoAssinatura || null
      });
    }

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Checklist Diário Assinado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function createDailyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const nome = getInputValue(formData, "nome");
    const detalhamentoLimpeza = getInputValue(formData, "detalhamentoLimpeza");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? 1;
    const turnos = buildDailyTurnoFlags(formData);

    ensureNonEmpty(nome, "Área");
    ensureDailyTurnoSelection(turnos);

    await prisma.planoLimpezaDiarioArea.create({
      data: {
        nome,
        detalhamentoLimpeza: detalhamentoLimpeza || null,
        ordem,
        turnoManha: turnos.turnoManha,
        turnoTarde: turnos.turnoTarde,
        turnoNoite: turnos.turnoNoite,
        ativo: true
      }
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Área do Plano Diário Criada com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function updateDailyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "areaId"));
    if (!areaId) {
      throw new Error("Área do plano diário inválida para edição.");
    }

    const existing = await prisma.planoLimpezaDiarioArea.findUnique({
      where: { id: areaId }
    });

    if (!existing) {
      throw new Error("Área do plano diário não encontrada.");
    }

    const nome = getInputValue(formData, "nome");
    const detalhamentoLimpeza = getInputValue(formData, "detalhamentoLimpeza");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? existing.ordem;
    const ativo = getInputValue(formData, "ativo") === "true";
    const turnos = buildDailyTurnoFlags(formData);

    ensureNonEmpty(nome, "Área");
    ensureDailyTurnoSelection(turnos);

    await prisma.planoLimpezaDiarioArea.update({
      where: { id: areaId },
      data: {
        nome,
        detalhamentoLimpeza: detalhamentoLimpeza || null,
        ordem,
        ativo,
        turnoManha: turnos.turnoManha,
        turnoTarde: turnos.turnoTarde,
        turnoNoite: turnos.turnoNoite
      }
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Área do Plano Diário Atualizada com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildDailyAreaConfigErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function toggleDailyAreaConfigStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "areaId"));
    if (!areaId) {
      throw new Error("Área do plano diário inválida para atualização.");
    }

    const existing = await prisma.planoLimpezaDiarioArea.findUnique({
      where: { id: areaId }
    });

    if (!existing) {
      throw new Error("Área do plano diário não encontrada.");
    }

    const ativo = getInputValue(formData, "ativo") === "true";

    await prisma.planoLimpezaDiarioArea.update({
      where: { id: areaId },
      data: { ativo }
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      ativo ? "Área Ativada com Sucesso." : "Área Inativada com Sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function deleteDailyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "areaId"));
    if (!areaId) {
      throw new Error("Área do plano diário inválida para exclusão.");
    }

    const existing = await prisma.planoLimpezaDiarioArea.findUnique({
      where: { id: areaId }
    });

    if (!existing) {
      throw new Error("Área do plano diário não encontrada.");
    }

    const linkedRecords = await prisma.planoLimpezaDiarioRegistro.count({
      where: { area: existing.nome }
    });

    if (linkedRecords > 0) {
      throw new Error(
        "Esta área já possui registros vinculados e não pode ser excluída definitivamente. Para preservar o histórico, utilize a opção Inativar."
      );
    }

    await prisma.planoLimpezaDiarioArea.delete({
      where: { id: areaId }
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Área do Plano Diário Excluída com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

function pendingUnsignedDailyItemExecutionWhere(itemId: number): Prisma.PlanoLimpezaDiarioRegistroWhereInput {
  return {
    itemId,
    status: StatusPlanoLimpeza.PENDENTE,
    assinaturaResponsavel: "",
    assinaturaSupervisor: ""
  };
}

function realDailyItemHistoryWhere(itemId: number): Prisma.PlanoLimpezaDiarioRegistroWhereInput {
  return {
    itemId,
    OR: [
      { status: { not: StatusPlanoLimpeza.PENDENTE } },
      { assinaturaResponsavel: { not: "" } },
      { assinaturaSupervisor: { not: "" } }
    ]
  };
}

async function getDailyAreaForItem(areaId: number) {
  const area = await prisma.planoLimpezaDiarioArea.findUnique({
    where: { id: areaId },
    select: { id: true, nome: true }
  });

  if (!area) {
    throw new Error("Selecione uma área diária cadastrada.");
  }

  return area;
}

export async function createDailyItemConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "areaId"));
    const descricao = getInputValue(formData, "descricao");
    const produtoUtilizado = getInputValue(formData, "produtoUtilizado");
    const setorResponsavel = getInputValue(formData, "setorResponsavel");
    const funcionarioResponsavel = getInputValue(formData, "funcionarioResponsavel");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? 1;

    if (!areaId) {
      throw new Error("Selecione a área do item/local diário.");
    }
    ensureNonEmpty(descricao, "Item/local");
    await getDailyAreaForItem(areaId);

    await prisma.planoLimpezaDiarioItem.create({
      data: {
        areaId,
        descricao,
        produtoUtilizado: produtoUtilizado || null,
        setorResponsavel: setorResponsavel || null,
        funcionarioResponsavel: funcionarioResponsavel || null,
        ordem,
        ativo: true
      }
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Item do Plano Diário Criado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildDailyItemConfigErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function updateDailyItemConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "dailyItemId"));
    const areaId = parsePositiveInt(getInputValue(formData, "areaId"));
    if (!itemId || !areaId) {
      throw new Error("Item diário inválido para edição.");
    }

    const existing = await prisma.planoLimpezaDiarioItem.findUnique({
      where: { id: itemId }
    });
    if (!existing || existing.excluidoEm) {
      throw new Error("Item diário não encontrado.");
    }

    const area = await getDailyAreaForItem(areaId);
    const descricao = getInputValue(formData, "descricao");
    const produtoUtilizado = getInputValue(formData, "produtoUtilizado");
    const setorResponsavel = getInputValue(formData, "setorResponsavel");
    const funcionarioResponsavel = getInputValue(formData, "funcionarioResponsavel");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? existing.ordem;
    const ativo = getInputValue(formData, "ativo") === "true";

    ensureNonEmpty(descricao, "Item/local");

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaDiarioItem.update({
        where: { id: itemId },
        data: {
          areaId,
          descricao,
          produtoUtilizado: produtoUtilizado || null,
          setorResponsavel: setorResponsavel || null,
          funcionarioResponsavel: funcionarioResponsavel || null,
          ordem,
          ativo
        }
      });

      await tx.planoLimpezaDiarioRegistro.updateMany({
        where: pendingUnsignedDailyItemExecutionWhere(itemId),
        data: {
          area: area.nome,
          itemDescricao: descricao,
          produtoUtilizado: produtoUtilizado || null,
          setorResponsavel: setorResponsavel || null,
          funcionarioResponsavel: funcionarioResponsavel || null
        }
      });
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Item do Plano Diário Atualizado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildDailyItemConfigErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function toggleDailyItemConfigStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "dailyItemId"));
    const ativo = getInputValue(formData, "ativo") === "true";
    if (!itemId) {
      throw new Error("Item diário inválido para atualização.");
    }

    const existing = await prisma.planoLimpezaDiarioItem.findUnique({
      where: { id: itemId }
    });
    if (!existing || existing.excluidoEm) {
      throw new Error("Item diário não encontrado.");
    }

    await prisma.planoLimpezaDiarioItem.update({
      where: { id: itemId },
      data: { ativo }
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      ativo ? "Item Ativado com Sucesso." : "Item Inativado com Sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function deleteDailyItemConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "dailyItemId"));
    if (!itemId) {
      throw new Error("Item diário inválido para exclusão.");
    }

    const existing = await prisma.planoLimpezaDiarioItem.findUnique({
      where: { id: itemId }
    });
    if (!existing || existing.excluidoEm) {
      throw new Error("Item diário não encontrado.");
    }

    const linkedRealHistory = await prisma.planoLimpezaDiarioRegistro.count({
      where: realDailyItemHistoryWhere(itemId)
    });

    if (linkedRealHistory === 0) {
      await prisma.$transaction(async (tx) => {
        await tx.planoLimpezaDiarioRegistro.deleteMany({
          where: pendingUnsignedDailyItemExecutionWhere(itemId)
        });
        await tx.planoLimpezaDiarioItem.delete({ where: { id: itemId } });
      });

      revalidateModulePaths();
      redirectWithFeedback(returnTo, "success", "Item do Plano Diário Excluído com Sucesso.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaDiarioRegistro.deleteMany({
        where: pendingUnsignedDailyItemExecutionWhere(itemId)
      });
      await tx.planoLimpezaDiarioItem.update({
        where: { id: itemId },
        data: { ativo: false, excluidoEm: getCurrentSystemDateTime() }
      });
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      "Este item possui histórico. Para preservar a auditoria, ele foi removido das rotinas futuras, mas os registros antigos permanecerão no histórico."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function bulkSignDailyByDateAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, DIARIO_HISTORY_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanSignSupervisor(actor.perfil);

    const dataRaw = getInputValue(formData, "data");
    const senhaConfirmacao = getInputValue(formData, "senhaConfirmacao");
    const assinarComoResponsavel = formData.get("assinarComoResponsavel") === "on";
    const observacao = getInputValue(formData, "observacao");
    if (assinarComoResponsavel) {
      throw new Error(
        "A assinatura em lote não pode registrar o mesmo usuário como responsável e supervisor."
      );
    }

    const data = parseDateInput(dataRaw);
    if (!data) {
      throw new Error("Data inválida para assinatura retroativa.");
    }

    const period = getMonthYear(data);
    if (await isMonthSigned(TipoPlanoLimpeza.DIARIO, period.mes, period.ano)) {
      throw new Error("Este dia pertence a um período fechado e não pode ser alterado.");
    }

    const registrosDoDia = await prisma.planoLimpezaDiarioRegistro.findMany({
      where: { data },
      select: {
        id: true,
        status: true,
        assinaturaResponsavel: true,
        assinaturaResponsavelUsuarioId: true,
        assinaturaSupervisor: true
      }
    });

    if (registrosDoDia.length === 0) {
      throw new Error("Não há registros para este dia.");
    }

    const aguardandoIds: number[] = [];
    const pendentesSemResponsavelIds: number[] = [];
    const selfSupervisorIds: number[] = [];

    for (const registro of registrosDoDia) {
      const hasResponsavel = registro.assinaturaResponsavel.trim().length > 0;
      const hasSupervisor = registro.assinaturaSupervisor.trim().length > 0;

      if (
        registro.status === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR &&
        hasResponsavel &&
        !hasSupervisor
      ) {
        if (isSameResponsibleUser(registro, actor)) {
          selfSupervisorIds.push(registro.id);
          continue;
        }
        aguardandoIds.push(registro.id);
      }

      if (
        registro.status === StatusPlanoLimpeza.PENDENTE &&
        !hasResponsavel &&
        !hasSupervisor
      ) {
        pendentesSemResponsavelIds.push(registro.id);
      }
    }

    if (selfSupervisorIds.length > 0) {
      throw new Error(SELF_SUPERVISION_MESSAGE);
    }

    if (aguardandoIds.length === 0 && (!assinarComoResponsavel || pendentesSemResponsavelIds.length === 0)) {
      throw new Error("Não há pendências elegíveis para assinatura retroativa neste dia.");
    }

    await validateSignaturePassword({ user: actor, password: senhaConfirmacao });
    const signedAt = getCurrentSystemDateTime();

    await prisma.$transaction(async (tx) => {
      if (aguardandoIds.length > 0) {
        const updateData: {
          assinaturaSupervisor: string;
          assinaturaSupervisorUsuarioId: number;
          assinaturaSupervisorNomeUsuario: string;
          assinaturaSupervisorPerfil: typeof actor.perfil;
          assinaturaSupervisorDataHora: Date;
          status: StatusPlanoLimpeza;
          observacaoSupervisor?: string;
        } = {
          assinaturaSupervisor: actor.nomeCompleto,
          assinaturaSupervisorUsuarioId: actor.id,
          assinaturaSupervisorNomeUsuario: actor.nomeUsuario,
          assinaturaSupervisorPerfil: actor.perfil,
          assinaturaSupervisorDataHora: signedAt,
          status: StatusPlanoLimpeza.CONCLUIDO
        };
        if (observacao) {
          updateData.observacaoSupervisor = observacao;
        }

        await tx.planoLimpezaDiarioRegistro.updateMany({
          where: { id: { in: aguardandoIds } },
          data: updateData
        });
      }
    });

    if (aguardandoIds.length > 0) {
      await createSignatureLog({
        user: actor,
        tipo: "SUPERVISOR",
        modulo: "plano-limpeza/diario",
        referenciaId: dataRaw
      });
    }

    revalidatePath(returnTo.split("?")[0]);
    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Assinatura Retroativa do Dia Aplicada com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function updateWeeklyRecordAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_PATH);

  try {
    const actor = await getCurrentUserForAction();
    const id = parsePositiveInt(getInputValue(formData, "id"));
    if (!id) {
      throw new Error("Registro semanal inválido para assinatura.");
    }

    const existing = await prisma.planoLimpezaSemanalExecucao.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error("Registro semanal não encontrado.");
    }

    const period = getMonthYear(existing.dataExecucao);
    if (await isMonthSigned(TipoPlanoLimpeza.SEMANAL, period.mes, period.ano)) {
      throw new Error("Este registro pertence a um período fechado e não pode ser alterado.");
    }

    const etapa = getInputValue(formData, "etapa");
    const senhaConfirmacao = getInputValue(formData, "senhaConfirmacao");
    const observacaoAssinatura = getInputValue(formData, "observacaoAssinatura");

    const etapaPermitida = getWeeklySignStage({
      status: existing.status,
      assinaturaResponsavel: existing.assinaturaResponsavel,
      assinaturaSupervisor: existing.assinaturaSupervisor
    });
    if (!etapaPermitida) {
      throw new Error("Este checklist não está disponível para nova assinatura.");
    }

    if (etapa !== etapaPermitida) {
      throw new Error("A etapa de assinatura informada é inválida para este checklist.");
    }

    await validateSignaturePassword({ user: actor, password: senhaConfirmacao });

    if (etapaPermitida === "responsavel") {
      ensureCanSignResponsible(actor.perfil);
      const signedAt = getCurrentSystemDateTime();

      await prisma.planoLimpezaSemanalExecucao.update({
        where: { id },
        data: {
          assinaturaResponsavel: actor.nomeCompleto,
          assinaturaResponsavelUsuarioId: actor.id,
          assinaturaResponsavelNomeUsuario: actor.nomeUsuario,
          assinaturaResponsavelPerfil: actor.perfil,
          assinaturaResponsavelDataHora: signedAt,
          quando: formatWeeklySignatureDateTime(signedAt),
          status: StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR,
          observacaoResponsavel: observacaoAssinatura || null
        }
      });
      await createSignatureLog({
        user: actor,
        tipo: "RESPONSAVEL",
        modulo: "plano-limpeza/semanal",
        referenciaId: String(id),
        observacao: observacaoAssinatura || null
      });
    } else {
      ensureCanSignSupervisor(actor.perfil);
      if (!existing.assinaturaResponsavel.trim()) {
        throw new Error("A assinatura do responsável é obrigatória antes da assinatura do supervisor.");
      }
      if (isSameResponsibleUser(existing, actor)) {
        throw new Error(SELF_SUPERVISION_MESSAGE);
      }
      const signedAt = getCurrentSystemDateTime();

      await prisma.planoLimpezaSemanalExecucao.update({
        where: { id },
        data: {
          assinaturaSupervisor: actor.nomeCompleto,
          assinaturaSupervisorUsuarioId: actor.id,
          assinaturaSupervisorNomeUsuario: actor.nomeUsuario,
          assinaturaSupervisorPerfil: actor.perfil,
          assinaturaSupervisorDataHora: signedAt,
          status: StatusPlanoLimpeza.CONCLUIDO,
          observacaoSupervisor: observacaoAssinatura || null
        }
      });
      await createSignatureLog({
        user: actor,
        tipo: "SUPERVISOR",
        modulo: "plano-limpeza/semanal",
        referenciaId: String(id),
        observacao: observacaoAssinatura || null
      });
    }

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Checklist Semanal Assinado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

async function normalizeWeeklyOrderForArea(
  tx: Prisma.TransactionClient,
  area: string
) {
  const items = await tx.planoLimpezaSemanalItem.findMany({
    where: { area, excluidoEm: null },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, ordem: true }
  });

  for (const [index, item] of items.entries()) {
    const expectedOrder = index + 1;
    if (item.ordem === expectedOrder) {
      continue;
    }

    await tx.planoLimpezaSemanalItem.update({
      where: { id: item.id },
      data: { ordem: expectedOrder }
    });
  }
}

async function normalizeWeeklyOrderForAreas(
  tx: Prisma.TransactionClient,
  areas: string[]
) {
  for (const area of new Set(areas)) {
    await normalizeWeeklyOrderForArea(tx, area);
  }
}

async function normalizeWeeklyAreaOrder(tx: Prisma.TransactionClient) {
  const areas = await tx.planoLimpezaSemanalArea.findMany({
    where: { excluidoEm: null },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }, { id: "asc" }],
    select: { id: true, ordem: true }
  });

  for (const [index, area] of areas.entries()) {
    const expectedOrder = index + 1;
    if (area.ordem === expectedOrder) {
      continue;
    }

    await tx.planoLimpezaSemanalArea.update({
      where: { id: area.id },
      data: { ordem: expectedOrder }
    });
  }
}

function weeklyExecutionScopeForArea(
  area: string,
  itemIds: number[]
): Prisma.PlanoLimpezaSemanalExecucaoWhereInput {
  return {
    OR: [
      { area },
      itemIds.length > 0 ? { itemId: { in: itemIds } } : { id: -1 }
    ]
  };
}

function disposableWeeklyExecutionWhere(
  scope: Prisma.PlanoLimpezaSemanalExecucaoWhereInput
): Prisma.PlanoLimpezaSemanalExecucaoWhereInput {
  return {
    AND: [
      scope,
      { status: StatusPlanoLimpeza.PENDENTE },
      { assinaturaResponsavel: "" },
      { assinaturaSupervisor: "" },
      { assinaturaResponsavelDataHora: null },
      { assinaturaSupervisorDataHora: null },
      { observacaoResponsavel: null },
      { observacaoSupervisor: null }
    ]
  };
}

function realWeeklyHistoryWhere(
  scope: Prisma.PlanoLimpezaSemanalExecucaoWhereInput
): Prisma.PlanoLimpezaSemanalExecucaoWhereInput {
  return {
    AND: [
      scope,
      {
        OR: [
          { status: { not: StatusPlanoLimpeza.PENDENTE } },
          { assinaturaResponsavel: { not: "" } },
          { assinaturaSupervisor: { not: "" } },
          { assinaturaResponsavelDataHora: { not: null } },
          { assinaturaSupervisorDataHora: { not: null } },
          { observacaoResponsavel: { not: null } },
          { observacaoSupervisor: { not: null } }
        ]
      }
    ]
  };
}

export async function createWeeklyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const nome = getInputValue(formData, "nome");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? 1;
    const ativo = getInputValue(formData, "ativo") !== "false";

    ensureNonEmpty(nome, "Área semanal");

    const duplicated = await prisma.planoLimpezaSemanalArea.findUnique({
      where: { nome }
    });
    if (duplicated && !duplicated.excluidoEm) {
      throw new Error("Já existe uma área semanal cadastrada com este nome.");
    }
    if (duplicated?.excluidoEm) {
      throw new Error("Já existe uma área semanal removida com este nome. Use outro nome para o novo cadastro.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalArea.create({
        data: { nome, ordem, ativo }
      });
      await normalizeWeeklyAreaOrder(tx);
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Área do Plano Semanal Criada com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildWeeklyAreaErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function updateWeeklyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "weeklyAreaId"));
    if (!areaId) {
      throw new Error("Área semanal inválida para edição.");
    }

    const existing = await prisma.planoLimpezaSemanalArea.findUnique({
      where: { id: areaId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Área semanal não encontrada.");
    }

    const nome = getInputValue(formData, "nome");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? existing.ordem;
    const ativo = getInputValue(formData, "ativo") === "true";

    ensureNonEmpty(nome, "Área semanal");

    const duplicated = await prisma.planoLimpezaSemanalArea.findUnique({
      where: { nome }
    });
    if (duplicated && duplicated.id !== existing.id && !duplicated.excluidoEm) {
      throw new Error("Já existe uma área semanal cadastrada com este nome.");
    }
    if (duplicated && duplicated.id !== existing.id && duplicated.excluidoEm) {
      throw new Error("Já existe uma área semanal removida com este nome. Use outro nome para o cadastro.");
    }

    const nomeAlterado = nome !== existing.nome;
    if (nomeAlterado) {
      const linkedExecutions = await prisma.planoLimpezaSemanalExecucao.count({
        where: { area: existing.nome }
      });

      if (linkedExecutions > 0) {
        throw new Error(
          "Esta área já possui registros vinculados e não pode ter o nome alterado. Para preservar o histórico, crie uma nova área e inative a antiga."
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalArea.update({
        where: { id: areaId },
        data: { nome, ordem, ativo }
      });

      if (nomeAlterado) {
        await tx.planoLimpezaSemanalItem.updateMany({
          where: { area: existing.nome },
          data: { area: nome }
        });
      }

      await normalizeWeeklyAreaOrder(tx);
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Área do Plano Semanal Atualizada com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildWeeklyAreaErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function toggleWeeklyAreaConfigStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "weeklyAreaId"));
    if (!areaId) {
      throw new Error("Área semanal inválida para atualização.");
    }

    const existing = await prisma.planoLimpezaSemanalArea.findUnique({
      where: { id: areaId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Área semanal não encontrada.");
    }

    const ativo = getInputValue(formData, "ativo") === "true";

    await prisma.planoLimpezaSemanalArea.update({
      where: { id: areaId },
      data: { ativo }
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      ativo ? "Área Semanal Ativada com Sucesso." : "Área Semanal Inativada com Sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function deleteWeeklyAreaConfigAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const areaId = parsePositiveInt(getInputValue(formData, "weeklyAreaId"));
    if (!areaId) {
      throw new Error("Área semanal inválida para exclusão.");
    }

    const existing = await prisma.planoLimpezaSemanalArea.findUnique({
      where: { id: areaId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Área semanal não encontrada.");
    }

    const linkedItems = await prisma.planoLimpezaSemanalItem.findMany({
      where: { area: existing.nome },
      select: { id: true }
    });
    const linkedItemIds = linkedItems.map((item) => item.id);
    const executionScope = weeklyExecutionScopeForArea(existing.nome, linkedItemIds);
    const linkedRealHistory = await prisma.planoLimpezaSemanalExecucao.count({
      where: realWeeklyHistoryWhere(executionScope)
    });

    if (linkedRealHistory === 0) {
      await prisma.$transaction(async (tx) => {
        await tx.planoLimpezaSemanalExecucao.deleteMany({
          where: disposableWeeklyExecutionWhere(executionScope)
        });
        await tx.planoLimpezaSemanalItem.deleteMany({
          where: { id: { in: linkedItemIds } }
        });
        await tx.planoLimpezaSemanalArea.delete({
          where: { id: areaId }
        });
        await normalizeWeeklyAreaOrder(tx);
      });

      revalidateModulePaths();
      redirectWithFeedback(
        returnTo,
        "success",
        linkedItemIds.length > 0
          ? "Área e itens vinculados excluídos com sucesso."
          : "Área excluída com sucesso."
      );
    }

    const now = getCurrentSystemDateTime();
    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalExecucao.deleteMany({
        where: disposableWeeklyExecutionWhere(executionScope)
      });
      await tx.planoLimpezaSemanalItem.updateMany({
        where: { id: { in: linkedItemIds } },
        data: { ativo: false, excluidoEm: now }
      });
      await tx.planoLimpezaSemanalArea.update({
        where: { id: areaId },
        data: { ativo: false, excluidoEm: now }
      });
      await normalizeWeeklyAreaOrder(tx);
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      "Esta área possui histórico de execução. Para preservar a auditoria, ela foi removida das rotinas futuras, mas os registros antigos permanecerão disponíveis no histórico."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function createWeeklyConfigItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const area = await ensureWeeklyAreaName(getInputValue(formData, "area"));
    const oQueLimpar = getInputValue(formData, "oQueLimpar");
    const qualProduto = getInputValue(formData, "qualProduto");
    const setorResponsavel = getInputValue(formData, "setorResponsavel");
    const quem = getInputValue(formData, "quem");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? 1;
    const ativo = getInputValue(formData, "ativo") !== "false";

    ensureNonEmpty(oQueLimpar, "Item/local específico");
    ensureNonEmpty(qualProduto, "Qual produto usar");
    ensureNonEmpty(quem, "Funcionário responsável");

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalItem.create({
        data: {
          area,
          oQueLimpar,
          qualProduto,
          quando: null,
          setorResponsavel: setorResponsavel || null,
          quem,
          ordem,
          ativo
        }
      });

      await normalizeWeeklyOrderForArea(tx, area);
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Item do Plano Semanal Criado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildWeeklyConfigItemErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function updateWeeklyConfigItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "itemId"));
    if (!itemId) {
      throw new Error("Item semanal inválido para edição.");
    }

    const existing = await prisma.planoLimpezaSemanalItem.findUnique({
      where: { id: itemId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Item semanal não encontrado.");
    }

    const area = await ensureWeeklyAreaName(getInputValue(formData, "area"));
    const oQueLimpar = getInputValue(formData, "oQueLimpar");
    const qualProduto = getInputValue(formData, "qualProduto");
    const setorResponsavel = getInputValue(formData, "setorResponsavel");
    const quem = getInputValue(formData, "quem");
    const ordem = parsePositiveInt(getInputValue(formData, "ordem")) ?? existing.ordem;
    const ativo = getInputValue(formData, "ativo") === "true";

    ensureNonEmpty(oQueLimpar, "Item/local específico");
    ensureNonEmpty(qualProduto, "Qual produto usar");
    ensureNonEmpty(quem, "Funcionário responsável");

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalItem.update({
        where: { id: itemId },
        data: {
          area,
          oQueLimpar,
          qualProduto,
          setorResponsavel: setorResponsavel || null,
          quem,
          ordem,
          ativo
        }
      });

      await normalizeWeeklyOrderForAreas(tx, [existing.area, area]);
    });

    revalidateModulePaths();
    redirectWithFeedback(returnTo, "success", "Item do Plano Semanal Atualizado com Sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      buildWeeklyConfigItemErrorReturnTo(returnTo, formData),
      "error",
      getErrorMessage(error)
    );
  }
}

export async function toggleWeeklyConfigItemStatusAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "itemId"));
    if (!itemId) {
      throw new Error("Item semanal inválido para atualização.");
    }

    const existing = await prisma.planoLimpezaSemanalItem.findUnique({
      where: { id: itemId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Item semanal não encontrado.");
    }

    const ativo = getInputValue(formData, "ativo") === "true";

    await prisma.planoLimpezaSemanalItem.update({
      where: { id: itemId },
      data: { ativo }
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      ativo ? "Item Ativado com Sucesso." : "Item Inativado com Sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function deleteWeeklyConfigItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "itemId"));
    if (!itemId) {
      throw new Error("Item semanal inválido para exclusão.");
    }

    const existing = await prisma.planoLimpezaSemanalItem.findUnique({
      where: { id: itemId }
    });

    if (!existing || existing.excluidoEm) {
      throw new Error("Item semanal não encontrado.");
    }

    const executionScope: Prisma.PlanoLimpezaSemanalExecucaoWhereInput = { itemId };
    const linkedRealHistory = await prisma.planoLimpezaSemanalExecucao.count({
      where: realWeeklyHistoryWhere(executionScope)
    });

    if (linkedRealHistory === 0) {
      await prisma.$transaction(async (tx) => {
        await tx.planoLimpezaSemanalExecucao.deleteMany({
          where: disposableWeeklyExecutionWhere(executionScope)
        });
        await tx.planoLimpezaSemanalItem.delete({
          where: { id: itemId }
        });
        await normalizeWeeklyOrderForArea(tx, existing.area);
      });

      revalidateModulePaths();
      redirectWithFeedback(returnTo, "success", "Item do Plano Semanal Excluído com Sucesso.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.planoLimpezaSemanalExecucao.deleteMany({
        where: disposableWeeklyExecutionWhere(executionScope)
      });
      await tx.planoLimpezaSemanalItem.update({
        where: { id: itemId },
        data: { ativo: false, excluidoEm: getCurrentSystemDateTime() }
      });
      await normalizeWeeklyOrderForArea(tx, existing.area);
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      "Este item possui histórico de execução. Para preservar a auditoria, ele foi removido das rotinas futuras, mas os registros antigos permanecerão disponíveis no histórico."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function moveWeeklyConfigItemAction(formData: FormData) {
  const returnTo = getReturnToPath(formData, SEMANAL_OPCOES_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor.perfil);

    const itemId = parsePositiveInt(getInputValue(formData, "itemId"));
    if (!itemId) {
      throw new Error("Item semanal inválido para reordenação.");
    }

    const direction = getInputValue(formData, "direction");
    if (direction !== "up" && direction !== "down") {
      throw new Error("Direção de reordenação inválida.");
    }

    const moved = await prisma.$transaction(async (tx) => {
      const current = await tx.planoLimpezaSemanalItem.findUnique({
        where: { id: itemId },
        select: { id: true, area: true, excluidoEm: true }
      });

      if (!current || current.excluidoEm) {
        throw new Error("Item semanal não encontrado.");
      }

      const items = await tx.planoLimpezaSemanalItem.findMany({
        where: { area: current.area, excluidoEm: null },
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true }
      });

      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) {
        throw new Error("Item semanal não encontrado para reordenação.");
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) {
        return false;
      }

      const reordered = [...items];
      const [currentItem] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, currentItem);

      for (const [orderIndex, item] of reordered.entries()) {
        await tx.planoLimpezaSemanalItem.update({
          where: { id: item.id },
          data: { ordem: orderIndex + 1 }
        });
      }

      return true;
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      moved
        ? "Ordem do Item Atualizada com Sucesso."
        : "O Item Já Está no Limite da Reordenação."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

async function closeMonthByType(params: {
  formData: FormData;
  tipo: TipoPlanoLimpeza;
  returnPath: string;
  countRecords: (range: { start: Date; end: Date }) => Promise<number>;
  successLabel: string;
}) {
  const returnTo = getReturnToPath(params.formData, params.returnPath);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanCloseMonth(actor.perfil);

    const mes = parsePositiveInt(getInputValue(params.formData, "mes"));
    const ano = parsePositiveInt(getInputValue(params.formData, "ano"));
    const senhaConfirmacao = getInputValue(params.formData, "senhaConfirmacao");
    const responsavelTecnico = actor.nomeCompleto;

    if (!mes || mes < 1 || mes > 12 || !ano) {
      throw new Error("Informe um mês e ano válidos para fechamento.");
    }

    await validateSignaturePassword({ user: actor, password: senhaConfirmacao });

    if (await isMonthSigned(params.tipo, mes, ano)) {
      throw new Error(`O mês ${String(mes).padStart(2, "0")}/${ano} já está assinado.`);
    }

    const range = getMonthDateRange(mes, ano);
    const quantidade = await params.countRecords(range);
    if (quantidade === 0) {
      throw new Error("Não há registros no período selecionado para fechamento.");
    }

    await prisma.planoLimpezaFechamento.upsert({
      where: { tipo_mes_ano: { tipo: params.tipo, mes, ano } },
      create: {
        tipo: params.tipo,
        mes,
        ano,
        responsavelTecnico,
        dataAssinatura: getCurrentSystemDateTime(),
        status: StatusFechamentoPlanoLimpeza.ASSINADO
      },
      update: {
        responsavelTecnico,
        dataAssinatura: getCurrentSystemDateTime(),
        status: StatusFechamentoPlanoLimpeza.ASSINADO
      }
    });

    await createSignatureLog({
      user: actor,
      tipo: "FECHAMENTO_MENSAL",
      modulo: params.tipo === TipoPlanoLimpeza.DIARIO ? "plano-limpeza/diario" : "plano-limpeza/semanal",
      referenciaId: `${params.tipo}-${mes}-${ano}`
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      `${params.successLabel} ${String(mes).padStart(2, "0")}/${ano} Fechado com Sucesso.`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

async function reopenMonthByType(params: {
  formData: FormData;
  tipo: TipoPlanoLimpeza;
  returnPath: string;
  successLabel: string;
}) {
  const returnTo = getReturnToPath(params.formData, params.returnPath);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanReopenMonth(actor.perfil);

    const mes = parsePositiveInt(getInputValue(params.formData, "mes"));
    const ano = parsePositiveInt(getInputValue(params.formData, "ano"));

    if (!mes || mes < 1 || mes > 12 || !ano) {
      throw new Error("Informe um mês e ano válidos para reabertura.");
    }

    const fechamento = await prisma.planoLimpezaFechamento.findUnique({
      where: { tipo_mes_ano: { tipo: params.tipo, mes, ano } }
    });

    if (!fechamento || fechamento.status !== StatusFechamentoPlanoLimpeza.ASSINADO) {
      throw new Error(`O mês ${String(mes).padStart(2, "0")}/${ano} não está assinado.`);
    }

    await prisma.planoLimpezaFechamento.update({
      where: { id: fechamento.id },
      data: {
        status: StatusFechamentoPlanoLimpeza.ABERTO
      }
    });

    revalidateModulePaths();
    redirectWithFeedback(
      returnTo,
      "success",
      `${params.successLabel} ${String(mes).padStart(2, "0")}/${ano} Reaberto com Sucesso.`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(returnTo, "error", getErrorMessage(error));
  }
}

export async function closeDailyMonthAction(formData: FormData) {
  await closeMonthByType({
    formData,
    tipo: TipoPlanoLimpeza.DIARIO,
    returnPath: DIARIO_PATH,
    countRecords: async ({ start, end }) =>
      prisma.planoLimpezaDiarioRegistro.count({
        where: { data: { gte: start, lte: end } }
      }),
    successLabel: "Plano Diário"
  });
}

export async function reopenDailyMonthAction(formData: FormData) {
  await reopenMonthByType({
    formData,
    tipo: TipoPlanoLimpeza.DIARIO,
    returnPath: DIARIO_PATH,
    successLabel: "Plano Diário"
  });
}

export async function closeWeeklyMonthAction(formData: FormData) {
  await closeMonthByType({
    formData,
    tipo: TipoPlanoLimpeza.SEMANAL,
    returnPath: SEMANAL_PATH,
    countRecords: async ({ start, end }) => {
      await ensureWeeklyChecklistForDateRange({ start, end });
      const records = await prisma.planoLimpezaSemanalExecucao.findMany({
        where: { dataExecucao: { gte: start, lte: end } },
        select: {
          id: true,
          dataExecucao: true,
          area: true,
          assinaturaResponsavel: true,
          assinaturaSupervisor: true,
          status: true
        }
      });

      return consolidateWeeklyExecutionsByAreaWeek(records).length;
    },
    successLabel: "Plano Semanal"
  });
}

export async function reopenWeeklyMonthAction(formData: FormData) {
  await reopenMonthByType({
    formData,
    tipo: TipoPlanoLimpeza.SEMANAL,
    returnPath: SEMANAL_PATH,
    successLabel: "Plano Semanal"
  });
}


