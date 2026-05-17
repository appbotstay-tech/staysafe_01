import type { UserRole } from "@/lib/rbac";

export const DASHBOARD_PERIODS = ["hoje", "semana", "mes", "personalizado"] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type DashboardNormalizedStatus =
  | "Pendente"
  | "Em andamento"
  | "Aguardando responsável"
  | "Aguardando supervisor"
  | "Concluído"
  | "Não conformidade"
  | "Cancelado";

export type DashboardDetailKind = "pending" | "completed";

export type DashboardInsightId =
  | "risco-operacional"
  | "alertas-operacionais"
  | "nao-conformidades"
  | "acoes-corretivas";

export type DashboardAlertSeverity = "Crítico" | "Atenção" | "Informativo";

export type DashboardRiskStatus =
  | "Operação em dia"
  | "Atenção necessária"
  | "Risco crítico";

export type DashboardDetailItem = {
  id: string;
  moduleId: string;
  moduleName: string;
  title: string;
  description?: string;
  status: DashboardNormalizedStatus;
  responsible?: string;
  dateTime?: string;
  href: string;
};

export type DashboardInsightItem = DashboardDetailItem & {
  severity: DashboardAlertSeverity;
  occurrenceType: string;
  correctiveAction?: string;
  hasEvidence?: boolean;
  relatedTicketStatus?: string;
};

export type DashboardInsightSummary = {
  id: DashboardInsightId;
  title: string;
  description: string;
  total: number;
  critical: number;
  attention: number;
  informative: number;
  resolved?: number;
  withCorrectiveAction?: number;
  withoutCorrectiveAction?: number;
  status?: DashboardRiskStatus;
  level?: DashboardAlertSeverity;
  details: DashboardInsightItem[];
};

export type DashboardEvolutionMetric = {
  id: string;
  label: string;
  value: string;
  description: string;
  severity: DashboardAlertSeverity;
};

export type DashboardSummaryCard = {
  id: string;
  title: string;
  description: string;
  href?: string;
  total: number;
  completed: number;
  pending: number;
  inProgress?: number;
  waitingResponsible?: number;
  waitingSupervisor?: number;
  percentCompleted: number;
  percentPending: number;
  pendingDetails: DashboardDetailItem[];
  completedDetails: DashboardDetailItem[];
};

export type DashboardModuleSummary = {
  id: string;
  name: string;
  href: string;
  total: number;
  completed: number;
  pending: number;
  percentCompleted: number;
  percentPending: number;
  status: "Concluído" | "Parcial" | "Pendente" | "Sem dados";
  note?: string;
};

export type DashboardProfileView = {
  role: UserRole;
  title: string;
  subtitle: string;
  showManagement: boolean;
};

export type DashboardData = {
  period: DashboardPeriod;
  periodLabel: string;
  customStartDate?: string;
  customEndDate?: string;
  filterError?: string;
  generatedAt: string;
  profileView: DashboardProfileView;
  cards: DashboardSummaryCard[];
  riskOverview: DashboardInsightSummary | null;
  insightSummaries: DashboardInsightSummary[];
  evolution: DashboardEvolutionMetric[];
  myPendencies: DashboardDetailItem[];
  moduleSummaries: DashboardModuleSummary[];
  scope: {
    daily: string;
    weekly: string;
    monthly: string;
    maintenance: string;
  };
};

export type DashboardDetailsResponse = {
  cardId: string;
  kind: DashboardDetailKind;
  total: number;
  details: DashboardDetailItem[];
};

export type DashboardInsightDetailsResponse = {
  sectionId: DashboardInsightId;
  total: number;
  details: DashboardInsightItem[];
};
