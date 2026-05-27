export const USER_ROLE_VALUES = ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"] as const;

export const CUSTOMER_USER_ROLE_VALUES = ["GERENTE", "NUTRICIONISTA", "COLABORADOR"] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];
export type CustomerUserRole = (typeof CUSTOMER_USER_ROLE_VALUES)[number];

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

export function canAccessModule(role: UserRole, href: string): boolean {
  return MODULE_ACCESS[role].includes(href);
}

export function canManageUsers(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE";
}

export function canViewResetRequests(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE";
}

export function canManageModuleOptions(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE";
}

export function canViewFullHistory(role: UserRole): boolean {
  return role !== "COLABORADOR";
}

export function canViewManagementSections(role: UserRole): boolean {
  return role !== "COLABORADOR";
}

export function canAccessReports(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canAccessTechnicalDocuments(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canManageTechnicalDocuments(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE";
}

export function canAccessValidityLabels(role: UserRole): boolean {
  return role === "DEV";
}

export function canDeleteOperationalRecords(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canCloseMonth(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canReopenMonth(role: UserRole): boolean {
  return role === "DEV";
}

export function canSignAsSupervisor(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canSignAsResponsible(role: UserRole): boolean {
  return role !== "NUTRICIONISTA";
}

export function canSignTechnical(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
}

export function canSignNutritionReview(role: UserRole): boolean {
  return role === "DEV" || role === "NUTRICIONISTA";
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

export function canOpenMaintenanceTicket(role: UserRole): boolean {
  return MODULE_ACCESS[role].includes("/chamados-manutencao");
}

export function canUpdateMaintenanceTicket(role: UserRole): boolean {
  return role === "DEV" || role === "GERENTE" || role === "NUTRICIONISTA";
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
