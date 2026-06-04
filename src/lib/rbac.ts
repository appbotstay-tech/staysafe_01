import { hasAnyPermission, hasPermission, type PermissionAwareUser } from "@/lib/permissions";

export const USER_ROLE_VALUES = ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"] as const;

export const CUSTOMER_USER_ROLE_VALUES = ["GERENTE", "NUTRICIONISTA", "COLABORADOR"] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];
export type CustomerUserRole = (typeof CUSTOMER_USER_ROLE_VALUES)[number];
type RoleSubject = UserRole | PermissionAwareUser;

const OPERATIONAL_MODULES = [
  "/higienizacao-hortifruti",
  "/controle-temperatura-equipamentos",
  "/controle-qualidade-oleo",
  "/rastreabilidade-recebimento",
  "/controle-buffet-amostras",
  "/plano-limpeza",
  "/chamados-manutencao"
];
const DEV_INTERNAL_MODULES = ["/etiquetas-validade"];

export function getRoleLabel(role: UserRole): string {
  if (role === "DEV") return "DEV";
  if (role === "GERENTE") return "Gerente";
  if (role === "NUTRICIONISTA") return "Nutricionista";
  return "Colaborador";
}

const MODULE_ACCESS: Record<UserRole, string[]> = {
  DEV: [
    ...OPERATIONAL_MODULES,
    ...DEV_INTERNAL_MODULES,
    "/relatorios",
    "/documentos-tecnicos"
  ],
  GERENTE: [...OPERATIONAL_MODULES, "/relatorios", "/documentos-tecnicos"],
  NUTRICIONISTA: [...OPERATIONAL_MODULES, "/relatorios", "/documentos-tecnicos"],
  COLABORADOR: OPERATIONAL_MODULES
};

function subjectToRole(subject: RoleSubject): UserRole {
  return typeof subject === "string" ? subject : subject.perfil;
}

function subjectToUser(subject: RoleSubject): PermissionAwareUser | null {
  return typeof subject === "string" ? null : subject;
}

export function canAccessModule(role: RoleSubject, href: string): boolean {
  const user = subjectToUser(role);
  if (user) {
    const permissionByHref: Record<string, string[]> = {
      "/higienizacao-hortifruti": ["modulo.hortifruti.acessar"],
      "/controle-temperatura-equipamentos": ["modulo.temperatura.acessar"],
      "/controle-qualidade-oleo": ["modulo.oleo.acessar"],
      "/rastreabilidade-recebimento": ["modulo.rastreabilidade.acessar"],
      "/controle-buffet-amostras": ["modulo.amostras.acessar"],
      "/plano-limpeza": ["modulo.limpeza_diaria.acessar", "modulo.limpeza_semanal.acessar"],
      "/chamados-manutencao": ["modulo.chamados.acessar"],
      "/etiquetas-validade": ["modulo.etiquetas.acessar"],
      "/documentos-tecnicos": ["modulo.documentos.acessar"],
      "/relatorios": ["modulo.relatorios.acessar"]
    };
    return hasAnyPermission(user, permissionByHref[href] ?? []);
  }

  const roleValue = subjectToRole(role);
  return MODULE_ACCESS[roleValue].includes(href);
}

export function canManageUsers(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user ? hasPermission(user, "usuarios.acessar") : role === "DEV" || role === "GERENTE";
}

export function canViewResetRequests(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user ? hasPermission(user, "usuarios.redefinir_senha") : role === "DEV" || role === "GERENTE";
}

export function canManageModuleOptions(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  if (user) {
    return hasAnyPermission(user, [
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
    ]);
  }

  return role === "DEV" || role === "GERENTE";
}

export function canViewFullHistory(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  if (user) {
    return hasAnyPermission(user, [
      "modulo.amostras.acessar_historico",
      "modulo.temperatura.acessar_historico",
      "modulo.oleo.acessar_historico",
      "modulo.rastreabilidade.acessar_historico",
      "modulo.limpeza_diaria.acessar_historico",
      "modulo.limpeza_semanal.acessar_historico"
    ]);
  }

  return role !== "COLABORADOR";
}

export function canViewManagementSections(role: RoleSubject): boolean {
  return canViewFullHistory(role) || canManageModuleOptions(role);
}

export function canAccessReports(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasPermission(user, "modulo.relatorios.acessar")
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canAccessTechnicalDocuments(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasPermission(user, "modulo.documentos.acessar")
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canManageTechnicalDocuments(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user ? hasPermission(user, "modulo.documentos.gerenciar_anexos") : role === "DEV" || role === "GERENTE";
}

export function canAccessValidityLabels(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user ? hasPermission(user, "modulo.etiquetas.acessar") : role === "DEV";
}

export function canDeleteOperationalRecords(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.hortifruti.excluir_registro",
        "modulo.amostras.excluir_registro",
        "modulo.temperatura.excluir_registro",
        "modulo.oleo.excluir_registro",
        "modulo.rastreabilidade.excluir_registro"
      ])
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canCloseMonth(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.hortifruti.fechar_mes",
        "modulo.amostras.fechar_mes",
        "modulo.temperatura.fechar_mes",
        "modulo.oleo.fechar_mes",
        "modulo.rastreabilidade.fechar_mes",
        "modulo.limpeza_diaria.fechar_mes",
        "modulo.limpeza_semanal.fechar_mes"
      ])
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canReopenMonth(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.hortifruti.reabrir_mes",
        "modulo.amostras.reabrir_mes",
        "modulo.temperatura.reabrir_mes",
        "modulo.oleo.reabrir_mes",
        "modulo.rastreabilidade.reabrir_mes",
        "modulo.limpeza_diaria.reabrir_mes",
        "modulo.limpeza_semanal.reabrir_mes"
      ])
    : role === "DEV";
}

export function canSignAsSupervisor(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.amostras.assinar_servico",
        "modulo.amostras.assinar_historico",
        "modulo.limpeza_diaria.assinar_todos",
        "modulo.limpeza_diaria.assinar_historico",
        "modulo.limpeza_semanal.editar_historico",
        "modulo.limpeza_semanal.assinar_dia"
      ])
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canSignAsResponsible(role: RoleSubject): boolean {
  return subjectToRole(role) !== "NUTRICIONISTA";
}

export function canSignTechnical(role: RoleSubject): boolean {
  const roleValue = subjectToRole(role);
  return roleValue === "DEV" || roleValue === "GERENTE" || roleValue === "NUTRICIONISTA";
}

export function canSignNutritionReview(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.amostras.assinar_historico",
        "modulo.temperatura.assinar_historico",
        "modulo.oleo.assinar_historico"
      ])
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canResetPassword(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === "DEV") {
    return true;
  }

  if (actorRole === "GERENTE") {
    return targetRole === "GERENTE" || targetRole === "NUTRICIONISTA" || targetRole === "COLABORADOR";
  }

  return false;
}

export function canOpenMaintenanceTicket(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasPermission(user, "modulo.chamados.criar_registro")
    : MODULE_ACCESS[subjectToRole(role)].includes("/chamados-manutencao");
}

export function canUpdateMaintenanceTicket(role: RoleSubject): boolean {
  const user = subjectToUser(role);
  return user
    ? hasAnyPermission(user, [
        "modulo.chamados.editar_registro_do_dia",
        "modulo.chamados.editar_historico"
      ])
    : role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname.startsWith("/trocar-senha") ||
    pathname.startsWith("/acesso-negado")
  ) {
    return true;
  }

  if (pathname.startsWith("/usuarios/solicitacoes")) {
    return canViewResetRequests(role);
  }

  if (pathname.startsWith("/usuarios")) {
    return canManageUsers(role);
  }

  if (pathname.startsWith("/relatorios")) {
    return canAccessReports(role);
  }

  if (pathname.startsWith("/documentos-tecnicos")) {
    return canAccessTechnicalDocuments(role);
  }

  if (pathname.includes("/opcoes")) {
    return canManageModuleOptions(role);
  }

  if (pathname.includes("/historico")) {
    return canViewFullHistory(role);
  }

  const knownModule = Object.values(MODULE_ACCESS)
    .flat()
    .find((href) => pathname === href || pathname.startsWith(`${href}/`));
  if (!knownModule) {
    return true;
  }

  return canAccessModule(role, knownModule);
}
