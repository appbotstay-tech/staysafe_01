import type { TipoAssinaturaSistema } from "@prisma/client";

import type { AuthenticatedUser } from "@/lib/auth-session";
import { getAppNow } from "@/lib/date-time";
import { verifyPassword } from "@/lib/password";
import { hasAnyPermission, hasPermission, type PermissionAwareUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  canResetPassword,
  canSignAsResponsible,
  canSignTechnical,
  type UserRole
} from "@/lib/rbac";

export type AuthorizationSubject = UserRole | PermissionAwareUser;

export const DEV_HISTORICAL_RECORDS_MESSAGE =
  "Apenas o usuário DEV pode editar ou excluir registros históricos.";

function subjectToUser(subject: AuthorizationSubject): PermissionAwareUser {
  if (typeof subject === "string") {
    return { perfil: subject };
  }

  return subject;
}

function subjectRole(subject: AuthorizationSubject): UserRole {
  return typeof subject === "string" ? subject : subject.perfil;
}

export function ensurePermission(
  subject: AuthorizationSubject,
  permissionCode: string,
  message = "Você não tem permissão para executar esta ação."
) {
  if (!hasPermission(subjectToUser(subject), permissionCode)) {
    throw new Error(message);
  }
}

export function ensureAnyPermission(
  subject: AuthorizationSubject,
  permissionCodes: string[],
  message = "Você não tem permissão para executar esta ação."
) {
  if (!hasAnyPermission(subjectToUser(subject), permissionCodes)) {
    throw new Error(message);
  }
}

export function isDevUser(subject: AuthorizationSubject): boolean {
  return subjectRole(subject) === "DEV";
}

export function canManageHistoricalRecords(subject: AuthorizationSubject): boolean {
  return isDevUser(subject);
}

export function ensureDevUserForHistoricalRecords(
  subject: AuthorizationSubject,
  message = DEV_HISTORICAL_RECORDS_MESSAGE
) {
  if (!canManageHistoricalRecords(subject)) {
    throw new Error(message);
  }
}

export function ensureCanManageUsers(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (!hasPermission(user, "usuarios.acessar")) {
    throw new Error("Você não tem permissão para gerenciar usuários.");
  }
}

export function ensureCanViewResetRequests(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (!hasPermission(user, "usuarios.redefinir_senha")) {
    throw new Error("Você não tem permissão para visualizar solicitações.");
  }
}

export function ensureCanAccessReports(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (!hasPermission(user, "modulo.relatorios.acessar")) {
    throw new Error("Você não tem permissão para acessar relatórios.");
  }
}

export function ensureCanManageOptions(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.hortifruti.gerenciar_cadastros",
      "modulo.amostras.gerenciar_cadastros",
      "modulo.temperatura.gerenciar_cadastros",
      "modulo.oleo.gerenciar_cadastros",
      "modulo.rastreabilidade.gerenciar_configuracoes",
      "modulo.limpeza_diaria.gerenciar_cadastros",
      "modulo.limpeza_semanal.gerenciar_cadastros",
      "modulo.chamados.gerenciar_cadastros",
      "modulo.relatorios.gerenciar_configuracoes",
      "sistema.configuracoes"
    ])
  ) {
    throw new Error("Você não tem permissão para gerenciar opções.");
  }
}

export function ensureCanManageTechnicalDocuments(subject: AuthorizationSubject) {
  if (!hasPermission(subjectToUser(subject), "modulo.documentos.gerenciar_anexos")) {
    throw new Error("Você não tem permissão para gerenciar anexos e documentos técnicos.");
  }
}

export function ensureCanAccessValidityLabels(subject: AuthorizationSubject) {
  if (!hasPermission(subjectToUser(subject), "modulo.etiquetas.acessar")) {
    throw new Error("Módulo interno disponível apenas para perfil DEV.");
  }
}

export function ensureCanCloseMonth(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.hortifruti.fechar_mes",
      "modulo.amostras.fechar_mes",
      "modulo.temperatura.fechar_mes",
      "modulo.oleo.fechar_mes",
      "modulo.rastreabilidade.fechar_mes",
      "modulo.limpeza_diaria.fechar_mes",
      "modulo.limpeza_semanal.fechar_mes"
    ])
  ) {
    throw new Error("Seu perfil não pode assinar fechamento mensal.");
  }
}

export function ensureCanDeleteOperationalRecords(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.hortifruti.excluir_registro",
      "modulo.amostras.excluir_registro",
      "modulo.temperatura.excluir_registro",
      "modulo.oleo.excluir_registro",
      "modulo.rastreabilidade.excluir_registro"
    ])
  ) {
    throw new Error("Seu perfil não pode excluir registros operacionais.");
  }
}

export function ensureCanReopenMonth(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.hortifruti.reabrir_mes",
      "modulo.amostras.reabrir_mes",
      "modulo.temperatura.reabrir_mes",
      "modulo.oleo.reabrir_mes",
      "modulo.rastreabilidade.reabrir_mes",
      "modulo.limpeza_diaria.reabrir_mes",
      "modulo.limpeza_semanal.reabrir_mes"
    ])
  ) {
    throw new Error("Seu perfil não pode reabrir períodos.");
  }
}

export function ensureCanSignResponsible(subject: AuthorizationSubject) {
  if (!canSignAsResponsible(subjectRole(subject))) {
    throw new Error("Seu perfil não pode assinar como responsável.");
  }
}

export function ensureCanSignSupervisor(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.amostras.assinar_servico",
      "modulo.amostras.assinar_historico",
      "modulo.limpeza_diaria.assinar_todos",
      "modulo.limpeza_diaria.assinar_historico",
      "modulo.limpeza_semanal.editar_historico",
      "modulo.limpeza_semanal.assinar_dia"
    ])
  ) {
    throw new Error("Seu perfil não pode registrar assinatura de supervisão.");
  }
}

export function ensureCanSignTechnical(subject: AuthorizationSubject) {
  if (!canSignTechnical(subjectRole(subject))) {
    throw new Error("Seu perfil não pode assinar como nutricionista.");
  }
}

export function ensureCanSignNutritionReview(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.amostras.assinar_historico",
      "modulo.temperatura.assinar_historico",
      "modulo.oleo.assinar_historico"
    ])
  ) {
    throw new Error("Apenas DEV, GERENTE ou NUTRICIONISTA podem assinar como supervisor.");
  }
}

export function ensureCanResetPassword(actor: AuthorizationSubject, targetRole: UserRole) {
  const user = subjectToUser(actor);
  if (!hasPermission(user, "usuarios.redefinir_senha")) {
    throw new Error("Você não tem permissão para redefinir a senha deste usuário.");
  }

  if (typeof actor === "string" && !canResetPassword(actor, targetRole)) {
    throw new Error("Você não tem permissão para redefinir a senha deste usuário.");
  }
}

export function ensureCanOpenMaintenance(subject: AuthorizationSubject) {
  if (!hasPermission(subjectToUser(subject), "modulo.chamados.criar_registro")) {
    throw new Error("Seu perfil não pode abrir chamados de manutenção.");
  }
}

export function ensureCanUpdateMaintenance(subject: AuthorizationSubject) {
  const user = subjectToUser(subject);
  if (
    !hasAnyPermission(user, [
      "modulo.chamados.editar_registro_do_dia",
      "modulo.chamados.editar_historico"
    ])
  ) {
    throw new Error("Seu perfil não pode atualizar chamados de manutenção.");
  }
}

export async function validateSignaturePassword(params: {
  user: AuthenticatedUser;
  password: string;
}) {
  const password = params.password.trim();
  if (!password) {
    throw new Error("Informe sua senha para confirmar a assinatura.");
  }

  const userDb = await prisma.usuario.findUnique({
    where: { id: params.user.id },
    select: { senhaHash: true }
  });
  if (!userDb || !verifyPassword(password, userDb.senhaHash)) {
    throw new Error("Senha inválida para confirmar a assinatura.");
  }
}

export async function createSignatureLog(params: {
  user: AuthenticatedUser;
  tipo: TipoAssinaturaSistema;
  modulo: string;
  referenciaId?: string | null;
  observacao?: string | null;
}) {
  await prisma.logAssinatura.create({
    data: {
      usuarioId: params.user.id,
      nomeUsuario: params.user.nomeUsuario,
      nomeCompleto: params.user.nomeCompleto,
      perfil: params.user.perfil,
      tipo: params.tipo,
      modulo: params.modulo,
      referenciaId: params.referenciaId ?? null,
      observacao: params.observacao ?? null,
      assinadoEm: getAppNow()
    }
  });
}
