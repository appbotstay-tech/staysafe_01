import type { UserRole } from "@/lib/rbac";

export const DASHBOARD_PERIODS = ["hoje", "semana", "mes"] as const;

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
  generatedAt: string;
  profileView: DashboardProfileView;
  cards: DashboardSummaryCard[];
  myPendencies: DashboardDetailItem[];
  moduleSummaries: DashboardModuleSummary[];
  scope: {
    daily: string;
    weekly: string;
    monthly: string;
    maintenance: string;
  };
};
