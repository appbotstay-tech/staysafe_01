import { ModuloDocumento } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationalDashboard } from "@/app/dashboard/components/operational-dashboard";
import {
  getOperationalDashboardData,
  parseDashboardPeriod
} from "@/app/dashboard/service";
import type { DashboardData, DashboardPeriod } from "@/app/dashboard/types";
import { DocumentosModuleHeader } from "@/components/documentos/documentos-module-header";
import { getCurrentUser } from "@/lib/auth-session";

type SearchParams = Record<string, string | string[] | undefined>;
type HomePageProps = {
  searchParams: Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana Atual" },
  { value: "mes", label: "Mês Atual" },
  { value: "personalizado", label: "Data personalizada" }
];

function dashboardPeriodHref(period: DashboardPeriod, data: DashboardData): string {
  const params = new URLSearchParams({ period });

  if (period === "personalizado") {
    if (data.customStartDate) params.set("startDate", data.customStartDate);
    if (data.customEndDate) params.set("endDate", data.customEndDate);
  }

  return `/?${params.toString()}`;
}

function DashboardHeaderActions({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={dashboardPeriodHref(option.value, data)}
            className={data.period === option.value ? "btn-primary" : "btn-secondary"}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {data.period === "personalizado" ? (
        <form method="get" className="grid w-full gap-2 sm:w-auto sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="period" value="personalizado" />
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Data inicial
            <input
              type="date"
              name="startDate"
              defaultValue={data.customStartDate ?? ""}
              className="bpma-input mt-1"
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Data final
            <input
              type="date"
              name="endDate"
              defaultValue={data.customEndDate ?? ""}
              className="bpma-input mt-1"
            />
          </label>
          <div className="sm:flex sm:items-end">
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Aplicar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const period = parseDashboardPeriod(firstParam(params.period));
  const dashboardData = await getOperationalDashboardData({
    user,
    period,
    startDate: firstParam(params.startDate),
    endDate: firstParam(params.endDate)
  });

  return (
    <div className="space-y-5">
      <DocumentosModuleHeader
        title="Resumo Operacional"
        modulo={ModuloDocumento.DASHBOARD_RESUMO_BPMA}
        modulePath="/"
        searchParams={params}
        actions={<DashboardHeaderActions data={dashboardData} />}
      />

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {dashboardData.periodLabel} | Atualizado em {dashboardData.generatedAt}
      </p>

      {dashboardData.filterError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {dashboardData.filterError}
        </p>
      ) : null}

      <OperationalDashboard data={dashboardData} />
    </div>
  );
}
