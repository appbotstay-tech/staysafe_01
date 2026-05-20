import { DocumentoTipo, ModuloDocumento } from "@prisma/client";

import { getAppDate } from "@/lib/date-time";
import { canAccessModule, canAccessReports, type UserRole } from "@/lib/rbac";

export type LaudoValidityStatus = "VALIDO" | "PROXIMO_VENCIMENTO" | "VENCIDO";

export const DOCUMENTO_TIPO_OPTIONS: Array<{
  value: DocumentoTipo;
  label: string;
}> = [
  { value: DocumentoTipo.LEGISLACAO, label: "Legislação" },
  { value: DocumentoTipo.LAUDO, label: "Laudo" },
  { value: DocumentoTipo.POP_MANUAL, label: "POP e Manuais" }
];

export const DOCUMENTO_MODULO_OPTIONS: Array<{
  value: ModuloDocumento;
  label: string;
  href: string | null;
}> = [
  {
    value: ModuloDocumento.DASHBOARD_RESUMO_BPMA,
    label: "Dashboard / Resumo BPMA",
    href: "/"
  },
  {
    value: ModuloDocumento.HIGIENIZACAO_HORTIFRUTI,
    label: "Higienização de Hortifruti",
    href: "/higienizacao-hortifruti"
  },
  {
    value: ModuloDocumento.CONTROLE_TEMPERATURA,
    label: "Controle de Temperatura de Equipamentos",
    href: "/controle-temperatura-equipamentos"
  },
  {
    value: ModuloDocumento.CONTROLE_QUALIDADE_OLEO,
    label: "Controle de Qualidade do Óleo",
    href: "/controle-qualidade-oleo"
  },
  {
    value: ModuloDocumento.RASTREABILIDADE_RECEBIMENTO,
    label: "Rastreabilidade de Recebimento",
    href: "/rastreabilidade-recebimento"
  },
  {
    value: ModuloDocumento.CONTROLE_BUFFET_AMOSTRAS,
    label: "Controle de Buffet / Amostras",
    href: "/controle-buffet-amostras"
  },
  {
    value: ModuloDocumento.PLANO_LIMPEZA_DIARIO,
    label: "Plano de Limpeza Diário",
    href: "/plano-limpeza/diario"
  },
  {
    value: ModuloDocumento.PLANO_LIMPEZA_SEMANAL,
    label: "Plano de Limpeza Semanal",
    href: "/plano-limpeza/semanal"
  },
  {
    value: ModuloDocumento.CHAMADOS_MANUTENCAO,
    label: "Chamados de Manutenção",
    href: "/chamados-manutencao"
  },
  {
    value: ModuloDocumento.RELATORIOS_AUDITORIA,
    label: "Relatórios e Auditoria",
    href: "/relatorios"
  }
];

const DOCUMENTO_TIPO_LABELS = new Map(
  DOCUMENTO_TIPO_OPTIONS.map((option) => [option.value, option.label])
);

const DOCUMENTO_MODULO_LABELS = new Map(
  DOCUMENTO_MODULO_OPTIONS.map((option) => [option.value, option.label])
);

const DOCUMENTO_MODULO_HREFS = new Map(
  DOCUMENTO_MODULO_OPTIONS.map((option) => [option.value, option.href])
);

export function getDocumentoTipoLabel(tipo: DocumentoTipo): string {
  return DOCUMENTO_TIPO_LABELS.get(tipo) ?? tipo;
}

export function getDocumentoModuloLabel(modulo: ModuloDocumento): string {
  return DOCUMENTO_MODULO_LABELS.get(modulo) ?? modulo;
}

export function getDocumentoModuloHref(modulo: ModuloDocumento): string | null {
  return DOCUMENTO_MODULO_HREFS.get(modulo) ?? null;
}

export function parseDocumentoTipo(value: string): DocumentoTipo | null {
  if (value === DocumentoTipo.LEGISLACAO) return DocumentoTipo.LEGISLACAO;
  if (value === DocumentoTipo.LAUDO) return DocumentoTipo.LAUDO;
  if (value === DocumentoTipo.POP_MANUAL) return DocumentoTipo.POP_MANUAL;
  return null;
}

export function parseModuloDocumento(value: string): ModuloDocumento | null {
  const found = DOCUMENTO_MODULO_OPTIONS.find((option) => option.value === value);
  return found?.value ?? null;
}

export function canAccessDocumentoModulo(role: UserRole, modulo: ModuloDocumento): boolean {
  const href = getDocumentoModuloHref(modulo);

  if (modulo === ModuloDocumento.DASHBOARD_RESUMO_BPMA) {
    return true;
  }

  if (modulo === ModuloDocumento.RELATORIOS_AUDITORIA) {
    return canAccessReports(role);
  }

  if (!href) {
    return false;
  }

  if (href.startsWith("/plano-limpeza/")) {
    return canAccessModule(role, "/plano-limpeza");
  }

  return canAccessModule(role, href);
}

export function getLaudoValidityStatus(
  dataValidade: Date | null | undefined,
  today: Date = getAppDate()
): LaudoValidityStatus {
  if (!dataValidade) {
    return "VALIDO";
  }

  const todayTime = today.getTime();
  const validityTime = dataValidade.getTime();

  if (validityTime < todayTime) {
    return "VENCIDO";
  }

  const daysUntilExpiration = Math.ceil(
    (validityTime - todayTime) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration <= 30) {
    return "PROXIMO_VENCIMENTO";
  }

  return "VALIDO";
}

export function getLaudoValidityLabel(status: LaudoValidityStatus): string {
  if (status === "VENCIDO") return "Vencido";
  if (status === "PROXIMO_VENCIMENTO") return "Próximo do vencimento";
  return "Válido";
}

export function getLaudoValidityClass(status: LaudoValidityStatus): string {
  if (status === "VENCIDO") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (status === "PROXIMO_VENCIMENTO") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
}

export function getDocumentoTipoClass(tipo: DocumentoTipo): string {
  if (tipo === DocumentoTipo.LEGISLACAO) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }

  if (tipo === DocumentoTipo.LAUDO) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function buildDownloadFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/:*?<>|]+/g, "-")
    .trim();

  return cleaned || "documento.pdf";
}
