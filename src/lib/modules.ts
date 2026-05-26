import type { UserRole } from "@/lib/rbac";

export type AppModule = {
  name: string;
  href: string;
  allowedRoles: UserRole[];
};

export const modules: AppModule[] = [
  {
    name: "Higienização de Hortifruti",
    href: "/higienizacao-hortifruti",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Controle de Temperatura de Equipamentos",
    href: "/controle-temperatura-equipamentos",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Controle de Qualidade do Óleo",
    href: "/controle-qualidade-oleo",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Rastreabilidade de Recebimento",
    href: "/rastreabilidade-recebimento",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Controle de Buffet / Amostras",
    href: "/controle-buffet-amostras",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Plano de Limpeza",
    href: "/plano-limpeza",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Chamados de Manutenção",
    href: "/chamados-manutencao",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA", "COLABORADOR"]
  },
  {
    name: "Etiquetas de Validade",
    href: "/etiquetas-validade",
    allowedRoles: ["DEV"]
  },
  {
    name: "Anexos e Documentos",
    href: "/documentos-tecnicos",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA"]
  },
  {
    name: "Relatórios e Auditoria",
    href: "/relatorios",
    allowedRoles: ["DEV", "GERENTE", "NUTRICIONISTA"]
  },
];

export function getModulesForRole(role: UserRole): AppModule[] {
  return modules.filter((module) => module.allowedRoles.includes(role));
}
