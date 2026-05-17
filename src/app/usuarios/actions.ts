"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { rethrowIfRedirectError } from "@/lib/redirect-error";

import { getCurrentUserForAction } from "@/lib/auth-session";
import { getAppNow, parseAppDateInput } from "@/lib/date-time";
import {
  ensureCanManageUsers,
  ensureCanResetPassword,
  ensureCanViewResetRequests
} from "@/lib/authz";
import { generateTemporaryPassword, hashPassword, validatePasswordRules } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/rbac";

const USERS_PATH = "/usuarios";
const REQUESTS_PATH = "/usuarios/solicitacoes";

function getInputValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(value: string): Date | null {
  return parseAppDateInput(value);
}

function parseRole(value: string): UserRole | null {
  if (value === "DEV" || value === "GERENTE" || value === "NUTRICIONISTA" || value === "COLABORADOR") {
    return value;
  }

  return null;
}

function parseStatus(value: string): "ATIVO" | "INATIVO" | null {
  if (value === "ATIVO" || value === "INATIVO") {
    return value;
  }

  return null;
}

function redirectWithFeedback(path: string, type: "success" | "error", feedback: string): never {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("feedbackType", type);
  url.searchParams.set("feedback", feedback);

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

function getUsersReturnToPath(formData: FormData, fallback: string): string {
  const value = getInputValue(formData, "returnTo");

  if (
    value === USERS_PATH ||
    value.startsWith(`${USERS_PATH}?`) ||
    value === REQUESTS_PATH ||
    value.startsWith(`${REQUESTS_PATH}?`)
  ) {
    return value;
  }

  return fallback;
}

type UpdateDraft = {
  userId: number;
  nomeCompleto: string;
  nomeUsuario: string;
  perfil: string;
  status: string;
  dataAdmissao: string;
  observacoesInternas: string;
  obrigarTrocaSenha: boolean;
};

function redirectWithUpdateDraftError(feedback: string, draft: UpdateDraft): never {
  const url = new URL(USERS_PATH, "http://localhost");
  url.searchParams.set("editId", String(draft.userId));
  url.searchParams.set("editError", feedback);
  url.searchParams.set("editNomeCompleto", draft.nomeCompleto);
  url.searchParams.set("editNomeUsuario", draft.nomeUsuario);
  url.searchParams.set("editPerfil", draft.perfil);
  url.searchParams.set("editStatus", draft.status);
  url.searchParams.set("editDataAdmissao", draft.dataAdmissao);
  url.searchParams.set("editObservacoesInternas", draft.observacoesInternas);
  url.searchParams.set("editObrigarTrocaSenha", draft.obrigarTrocaSenha ? "1" : "0");

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

async function getTargetUserForManagement(userId: number) {
  return prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nomeCompleto: true,
      nomeUsuario: true,
      perfil: true,
      status: true,
      isDevDefinitivo: true
    }
  });
}

function assertNotDevUser(target: {
  perfil: string;
  isDevDefinitivo?: boolean;
}) {
  if (target.isDevDefinitivo || target.perfil === "DEV") {
    throw new Error("O usuário DEV é técnico e não pode ser gerenciado pela tela de usuários.");
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageUsers(actor.perfil);

    const nomeCompleto = getInputValue(formData, "nomeCompleto");
    const nomeUsuario = getInputValue(formData, "nomeUsuario");
    const perfil = parseRole(getInputValue(formData, "perfil"));
    const status = parseStatus(getInputValue(formData, "status")) ?? "ATIVO";
    const dataAdmissao = parseDateOnly(getInputValue(formData, "dataAdmissao"));
    const observacoesInternas = getInputValue(formData, "observacoesInternas") || null;
    const senhaInicial = getInputValue(formData, "senhaInicial");
    const obrigarTrocaSenha = formData.get("obrigarTrocaSenha") === "on";

    if (!nomeCompleto || !nomeUsuario || !perfil || !senhaInicial) {
      throw new Error("Preencha todos os campos obrigatórios de criação.");
    }

    if (perfil === "DEV") {
      throw new Error("O usuário DEV deve ser criado apenas pelo bootstrap técnico.");
    }

    const passwordRuleError = validatePasswordRules(senhaInicial);
    if (passwordRuleError) {
      throw new Error(passwordRuleError);
    }

    const existente = await prisma.usuario.findUnique({
      where: { nomeUsuario },
      select: { id: true }
    });
    if (existente) {
      throw new Error("Nome de usuário já cadastrado.");
    }

    await prisma.usuario.create({
      data: {
        nomeCompleto,
        nomeUsuario,
        senhaHash: hashPassword(senhaInicial),
        perfil,
        status,
        dataAdmissao,
        observacoesInternas,
        obrigarTrocaSenha,
        ultimaAlteracaoSenha: getAppNow()
      }
    });

    redirectWithFeedback(USERS_PATH, "success", "Usuário criado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message =
      error instanceof Error && error.message ? error.message : "Não foi possível criar o usuário.";
    redirectWithFeedback(USERS_PATH, "error", message);
  }
}

export async function updateUserAction(formData: FormData) {
  const userId = Number(getInputValue(formData, "userId"));
  const nomeCompleto = getInputValue(formData, "nomeCompleto");
  const nomeUsuario = getInputValue(formData, "nomeUsuario");
  const perfilInput = getInputValue(formData, "perfil");
  const statusInput = getInputValue(formData, "status");
  const dataAdmissaoInput = getInputValue(formData, "dataAdmissao");
  const observacoesInternas = getInputValue(formData, "observacoesInternas") || "";
  const obrigarTrocaSenha = formData.get("obrigarTrocaSenha") === "on";

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageUsers(actor.perfil);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Usuário inválido para edição.");
    }

    const perfil = parseRole(perfilInput);
    const status = parseStatus(statusInput);
    const dataAdmissao = parseDateOnly(dataAdmissaoInput);

    if (!nomeCompleto || !nomeUsuario || !perfil || !status) {
      throw new Error("Preencha todos os campos obrigatórios.");
    }

    const target = await getTargetUserForManagement(userId);
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    assertNotDevUser(target);

    if (target.isDevDefinitivo) {
      if (nomeUsuario !== target.nomeUsuario) {
        throw new Error("Não é permitido alterar o nome de usuário do DEV definitivo.");
      }
      if (perfil !== "DEV") {
        throw new Error("O DEV definitivo deve manter o perfil DEV.");
      }
      if (status !== "ATIVO") {
        throw new Error("O DEV definitivo deve permanecer ativo.");
      }
    }

    const nomeUsuarioEmUso = await prisma.usuario.findFirst({
      where: {
        nomeUsuario,
        id: { not: userId }
      },
      select: { id: true }
    });
    if (nomeUsuarioEmUso) {
      throw new Error("Nome de usuário já está em uso por outro cadastro.");
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        nomeCompleto,
        nomeUsuario,
        perfil,
        status,
        dataAdmissao,
        observacoesInternas: observacoesInternas || null,
        obrigarTrocaSenha
      }
    });

    redirectWithFeedback(USERS_PATH, "success", "Usuário atualizado com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível atualizar o usuário.";

    if (Number.isInteger(userId) && userId > 0) {
      redirectWithUpdateDraftError(message, {
        userId,
        nomeCompleto,
        nomeUsuario,
        perfil: perfilInput,
        status: statusInput,
        dataAdmissao: dataAdmissaoInput,
        observacoesInternas,
        obrigarTrocaSenha
      });
    }

    redirectWithFeedback(USERS_PATH, "error", message);
  }
}

export async function toggleUserStatusAction(formData: FormData) {
  const returnTo = getUsersReturnToPath(formData, USERS_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageUsers(actor.perfil);

    const userId = Number(getInputValue(formData, "userId"));
    const status = parseStatus(getInputValue(formData, "status"));
    if (!Number.isInteger(userId) || userId <= 0 || !status) {
      throw new Error("Dados inválidos para atualização de status.");
    }

    const target = await getTargetUserForManagement(userId);
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    assertNotDevUser(target);

    if (target.id === actor.id && status === "INATIVO") {
      throw new Error("Você não pode inativar o próprio usuário.");
    }

    if (target.isDevDefinitivo && status === "INATIVO") {
      throw new Error("O usuário DEV definitivo não pode ser inativado.");
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: { status }
    });

    redirectWithFeedback(
      USERS_PATH,
      "success",
      status === "ATIVO" ? "Usuário ativado com sucesso." : "Usuário inativado com sucesso."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    const message =
      error instanceof Error && error.message ? error.message : "Não foi possível alterar o status.";
    redirectWithFeedback(returnTo, "error", message);
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  const returnTo = getUsersReturnToPath(formData, USERS_PATH);

  try {
    const actor = await getCurrentUserForAction();

    const userId = Number(getInputValue(formData, "userId"));
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Usuário inválido para redefinição de senha.");
    }

    const target = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, perfil: true, nomeCompleto: true, isDevDefinitivo: true }
    });
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    assertNotDevUser(target);
    ensureCanResetPassword(actor.perfil, target.perfil as UserRole);

    const senhaTemporariaInformada = getInputValue(formData, "senhaTemporaria");
    const senhaTemporaria = senhaTemporariaInformada || generateTemporaryPassword();
    const passwordRuleError = validatePasswordRules(senhaTemporaria);
    if (passwordRuleError) {
      throw new Error(passwordRuleError);
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        senhaHash: hashPassword(senhaTemporaria),
        obrigarTrocaSenha: true,
        ultimaAlteracaoSenha: getAppNow()
      }
    });

    redirectWithFeedback(
      USERS_PATH,
      "success",
      `Senha temporária de ${target.nomeCompleto}: ${senhaTemporaria}`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível redefinir a senha.";
    redirectWithFeedback(returnTo, "error", message);
  }
}

export async function deleteUserAction(formData: FormData) {
  const returnTo = getUsersReturnToPath(formData, USERS_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageUsers(actor.perfil);

    const userId = Number(getInputValue(formData, "userId"));
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Usuário inválido para remoção.");
    }

    const target = await getTargetUserForManagement(userId);
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    assertNotDevUser(target);

    if (target.id === actor.id) {
      throw new Error("Você não pode remover o próprio usuário.");
    }

    if (target.isDevDefinitivo) {
      throw new Error("O usuário DEV definitivo não pode ser removido.");
    }

    await prisma.usuario.delete({
      where: { id: userId }
    });

    redirectWithFeedback(USERS_PATH, "success", "Usuário removido com sucesso.");
  } catch (error) {
    rethrowIfRedirectError(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirectWithFeedback(
        returnTo,
        "error",
        "Não foi possível remover o usuário porque ele possui histórico vinculado. Inative-o."
      );
    }

    const message =
      error instanceof Error && error.message ? error.message : "Não foi possível remover o usuário.";
    redirectWithFeedback(returnTo, "error", message);
  }
}

export async function handleResetRequestAction(formData: FormData) {
  const returnTo = getUsersReturnToPath(formData, REQUESTS_PATH);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanViewResetRequests(actor.perfil);

    const requestId = Number(getInputValue(formData, "requestId"));
    const senhaTemporariaInformada = getInputValue(formData, "senhaTemporaria");
    const observacaoInterna = getInputValue(formData, "observacaoInterna") || null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new Error("Solicitação inválida.");
    }

    const solicitacao = await prisma.solicitacaoRedefinicaoSenha.findUnique({
      where: { id: requestId },
      include: {
        usuario: {
          select: { id: true, perfil: true, nomeCompleto: true, isDevDefinitivo: true }
        }
      }
    });
    if (!solicitacao) {
      throw new Error("Solicitação não encontrada.");
    }

    if (solicitacao.status !== "PENDENTE") {
      throw new Error("Esta solicitação já foi tratada.");
    }

    if (!solicitacao.usuario) {
      await prisma.solicitacaoRedefinicaoSenha.update({
        where: { id: requestId },
        data: {
          status: "CANCELADA",
          observacaoInterna:
            observacaoInterna ||
            "Solicitação cancelada: usuário não identificado no sistema.",
          tratadoPorId: actor.id,
          tratadoEm: getAppNow()
        }
      });
      redirectWithFeedback(
        REQUESTS_PATH,
        "success",
        "Solicitação cancelada porque o usuário não foi localizado."
      );
    }

    assertNotDevUser(solicitacao.usuario);
    ensureCanResetPassword(actor.perfil, solicitacao.usuario.perfil as UserRole);

    const senhaTemporaria = senhaTemporariaInformada || generateTemporaryPassword();
    const passwordRuleError = validatePasswordRules(senhaTemporaria);
    if (passwordRuleError) {
      throw new Error(passwordRuleError);
    }

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: solicitacao.usuario!.id },
        data: {
          senhaHash: hashPassword(senhaTemporaria),
          obrigarTrocaSenha: true,
          ultimaAlteracaoSenha: getAppNow()
        }
      });
      await tx.solicitacaoRedefinicaoSenha.update({
        where: { id: requestId },
        data: {
          status: "ATENDIDA",
          observacaoInterna: observacaoInterna,
          tratadoPorId: actor.id,
          tratadoEm: getAppNow()
        }
      });
    });

    redirectWithFeedback(
      REQUESTS_PATH,
      "success",
      `Solicitação atendida. Senha temporária: ${senhaTemporaria}`
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível tratar a solicitação.";
    redirectWithFeedback(returnTo, "error", message);
  }
}


