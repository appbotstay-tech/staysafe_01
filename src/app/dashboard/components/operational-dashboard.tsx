"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  DashboardData,
  DashboardDetailItem,
  DashboardDetailKind,
  DashboardDetailsResponse,
  DashboardModuleSummary,
  DashboardNormalizedStatus,
  DashboardPeriod,
  DashboardSummaryCard
} from "../types";

const MAIN_CARD_IDS = new Set(["diarias", "semanais", "mensal", "chamados"]);
const CLEANING_MODULE_IDS = new Set(["limpeza-diaria", "limpeza-semanal"]);
const MODULE_ORDER = [
  "hortifruti",
  "temperatura",
  "oleo",
  "rastreabilidade",
  "buffet",
  "plano-limpeza",
  "chamados"
];
const MODULE_LABELS: Record<string, string> = {
  temperatura: "Controle de Temperatura de Equipamentos",
  rastreabilidade: "Rastreabilidade de Recebimento",
  "plano-limpeza": "Plano de Limpeza"
};

type OperationalDashboardProps = {
  data: DashboardData;
};

type ExpandedState = {
  cardId: string;
  kind: DashboardDetailKind;
} | null;

type DetailLoadState = {
  details: DashboardDetailItem[];
  total: number;
  loading: boolean;
  loaded: boolean;
  error?: string;
};

type ModuleVisualStatus = "Concluído" | "Atenção" | "Crítico" | "Sem dados";

type ModuleSnapshot = {
  id: string;
  name: string;
  href: string;
  total: number;
  completed: number;
  pending: number;
  percentCompleted: number;
  percentPending: number;
  status: ModuleVisualStatus;
  note?: string;
};

function detailCacheKey(
  period: DashboardPeriod,
  cardId: string,
  kind: DashboardDetailKind,
  startDate?: string,
  endDate?: string
): string {
  return `${period}:${startDate ?? ""}:${endDate ?? ""}:${cardId}:${kind}`;
}

function appendCustomRangeParams(query: URLSearchParams, data: DashboardData): void {
  if (data.period !== "personalizado") {
    return;
  }

  if (data.customStartDate) query.set("startDate", data.customStartDate);
  if (data.customEndDate) query.set("endDate", data.customEndDate);
}

function CompletionDonut({
  completed,
  pending,
  percentCompleted
}: {
  completed: number;
  pending: number;
  percentCompleted: number;
}) {
  const hasData = completed + pending > 0;
  const completedDegrees = hasData ? Math.min(360, Math.max(0, percentCompleted * 3.6)) : 0;
  const chartBackground = hasData
    ? `conic-gradient(#10b981 0deg ${completedDegrees}deg, #f59e0b ${completedDegrees}deg 360deg)`
    : "conic-gradient(#cbd5e1 0deg 360deg)";

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div
        className="relative grid h-24 w-24 place-items-center rounded-full sm:h-28 sm:w-28"
        style={{ background: chartBackground }}
        aria-label={`${percentCompleted}% concluído, ${completed} concluídas e ${pending} pendentes`}
      >
        <div className="absolute inset-[10px] rounded-full bg-white dark:bg-slate-900" />
        <div className="relative text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {percentCompleted}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            concluído
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Concluídas
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Pendentes
        </span>
      </div>
    </div>
  );
}

function calculatePercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function displayModuleName(moduleSummary: Pick<DashboardModuleSummary, "id" | "name">): string {
  return MODULE_LABELS[moduleSummary.id] ?? moduleSummary.name;
}

function moduleVisualStatus(total: number, pending: number, percentPending: number): ModuleVisualStatus {
  if (total === 0) {
    return "Sem dados";
  }

  if (pending === 0) {
    return "Concluído";
  }

  if (pending >= 8 || percentPending >= 50) {
    return "Crítico";
  }

  return "Atenção";
}

function buildModuleSnapshot(params: {
  id: string;
  name: string;
  href: string;
  total: number;
  completed: number;
  pending: number;
  note?: string;
}): ModuleSnapshot {
  const percentCompleted = calculatePercent(params.completed, params.total);
  const percentPending = calculatePercent(params.pending, params.total);

  return {
    ...params,
    percentCompleted,
    percentPending,
    status: moduleVisualStatus(params.total, params.pending, percentPending)
  };
}

function buildModuleSnapshots(modules: DashboardModuleSummary[]): ModuleSnapshot[] {
  const cleaningModules = modules.filter((moduleSummary) =>
    CLEANING_MODULE_IDS.has(moduleSummary.id)
  );
  const regularModules = modules
    .filter((moduleSummary) => !CLEANING_MODULE_IDS.has(moduleSummary.id))
    .map((moduleSummary) =>
      buildModuleSnapshot({
        id: moduleSummary.id,
        name: displayModuleName(moduleSummary),
        href: moduleSummary.href,
        total: moduleSummary.total,
        completed: moduleSummary.completed,
        pending: moduleSummary.pending,
        note: moduleSummary.note
      })
    );

  if (cleaningModules.length > 0) {
    const total = cleaningModules.reduce((sum, moduleSummary) => sum + moduleSummary.total, 0);
    const completed = cleaningModules.reduce(
      (sum, moduleSummary) => sum + moduleSummary.completed,
      0
    );
    const pending = cleaningModules.reduce((sum, moduleSummary) => sum + moduleSummary.pending, 0);

    regularModules.push(
      buildModuleSnapshot({
        id: "plano-limpeza",
        name: "Plano de Limpeza",
        href: "/plano-limpeza",
        total,
        completed,
        pending
      })
    );
  }

  return regularModules.sort(
    (left, right) => MODULE_ORDER.indexOf(left.id) - MODULE_ORDER.indexOf(right.id)
  );
}

function statusBadgeClass(status: DashboardNormalizedStatus): string {
  if (status === "Concluído") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === "Não conformidade") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (status === "Em andamento") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }

  if (status === "Aguardando supervisor") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200";
  }

  if (status === "Cancelado") {
    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

function moduleStatusClass(status: ModuleVisualStatus): string {
  if (status === "Concluído") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === "Crítico") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (status === "Sem dados") {
    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

function groupDetails(details: DashboardDetailItem[]) {
  const grouped = new Map<string, DashboardDetailItem[]>();

  for (const detail of details) {
    grouped.set(detail.moduleName, [...(grouped.get(detail.moduleName) ?? []), detail]);
  }

  return Array.from(grouped.entries());
}

function DetailList({
  details,
  emptyText
}: {
  details: DashboardDetailItem[];
  emptyText: string;
}) {
  if (details.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupDetails(details).map(([moduleName, items]) => (
        <div key={moduleName} className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {moduleName}
          </h4>
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-normal text-sm font-medium text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 whitespace-normal break-normal text-xs text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {item.responsible ? <span>{item.responsible}</span> : null}
                      {item.dateTime ? <span>{item.dateTime}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <Link href={item.href} className="btn-secondary whitespace-nowrap">
                      Abrir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardDetails({
  title,
  state,
  total,
  details,
  emptyText,
  onClose
}: {
  title: string;
  state?: DetailLoadState;
  total: number;
  details: DashboardDetailItem[];
  emptyText: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
        >
          Recolher
        </button>
      </div>
      {state?.loading ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Carregando detalhes...
        </p>
      ) : state?.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {state.error}
        </p>
      ) : total > details.length ? (
        <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Mostrando {details.length} de {total} itens. Use Abrir para ver o módulo completo.
        </p>
      ) : null}
      {!state?.loading && !state?.error ? (
        <DetailList details={details} emptyText={emptyText} />
      ) : null}
    </div>
  );
}

function SummaryCard({
  card,
  expanded,
  detailsState,
  onToggle
}: {
  card: DashboardSummaryCard;
  expanded: ExpandedState;
  detailsState?: DetailLoadState;
  onToggle: (cardId: string, kind: DashboardDetailKind) => void;
}) {
  const expandedKind = expanded?.cardId === card.id ? expanded.kind : null;
  const expandedDetails = detailsState?.details ?? [];
  const expandedTotal =
    expandedKind === "completed"
      ? detailsState?.total ?? card.completed
      : detailsState?.total ?? card.pending;

  return (
    <article
      className={`bpma-card-compact flex flex-col gap-3 ${
        expandedKind ? "sm:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {card.title}
        </h2>
        {card.href && card.href !== "/" ? (
          <Link href={card.href} className="btn-secondary shrink-0 px-3 py-2 text-xs">
            Abrir
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CompletionDonut
          completed={card.completed}
          pending={card.pending}
          percentCompleted={card.percentCompleted}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {card.percentCompleted}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">concluídas</p>
            </div>
            <p className="text-right text-sm font-medium text-slate-700 dark:text-slate-200">
              {card.completed} de {card.total}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {card.completed} concluídas | {card.pending} pendentes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          onClick={() => onToggle(card.id, "completed")}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
        >
          <span className="block text-lg font-semibold">{card.completed}</span>
          <span className="text-xs">concluídas</span>
        </button>
        <button
          type="button"
          onClick={() => onToggle(card.id, "pending")}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          <span className="block text-lg font-semibold">{card.pending}</span>
          <span className="text-xs">pendentes</span>
        </button>
      </div>

      {expandedKind ? (
        <CardDetails
          title={expandedKind === "completed" ? "Concluídas" : "Pendências"}
          state={detailsState}
          total={expandedTotal}
          details={expandedDetails}
          emptyText={
            expandedKind === "completed"
              ? "Nenhuma tarefa concluída neste grupo."
              : "Nenhuma pendência neste grupo."
          }
          onClose={() => onToggle(card.id, expandedKind)}
        />
      ) : null}
    </article>
  );
}

function ModuleSummaryGrid({ modules }: { modules: ModuleSnapshot[] }) {
  return (
    <section className="bpma-card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Resumo por Módulo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Visão rápida de concluídos, pendentes e status por área.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {modules.map((moduleSnapshot) => (
          <Link
            key={moduleSnapshot.id}
            href={moduleSnapshot.href}
            className="bpma-clickable-card flex min-h-36 flex-col justify-between gap-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 whitespace-normal break-normal text-sm font-semibold text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100">
                {moduleSnapshot.name}
              </h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${moduleStatusClass(
                  moduleSnapshot.status
                )}`}
              >
                {moduleSnapshot.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <span className="block text-lg font-semibold">{moduleSnapshot.completed}</span>
                <span className="text-xs">concluídos</span>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <span className="block text-lg font-semibold">{moduleSnapshot.pending}</span>
                <span className="text-xs">pendentes</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{moduleSnapshot.percentCompleted}% concluído</span>
              <span className="btn-secondary px-3 py-1 text-xs">Abrir</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OperationalDashboard({ data }: OperationalDashboardProps) {
  const [expanded, setExpanded] = useState<ExpandedState>(null);
  const [detailCache, setDetailCache] = useState<Record<string, DetailLoadState>>({});

  const moduleSnapshots = useMemo(
    () => buildModuleSnapshots(data.moduleSummaries),
    [data.moduleSummaries]
  );
  const mainCards = data.cards.filter((card) => MAIN_CARD_IDS.has(card.id));

  const loadDetails = async (cardId: string, kind: DashboardDetailKind) => {
    const key = detailCacheKey(
      data.period,
      cardId,
      kind,
      data.customStartDate,
      data.customEndDate
    );
    const current = detailCache[key];

    if (current?.loaded || current?.loading) {
      return;
    }

    setDetailCache((cache) => ({
      ...cache,
      [key]: {
        details: [],
        total: 0,
        loading: true,
        loaded: false
      }
    }));

    try {
      const query = new URLSearchParams({
        period: data.period,
        cardId,
        kind
      });
      appendCustomRangeParams(query, data);
      const response = await fetch(`/api/dashboard/details?${query.toString()}`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar detalhes.");
      }

      const payload = (await response.json()) as DashboardDetailsResponse;

      setDetailCache((cache) => ({
        ...cache,
        [key]: {
          details: payload.details,
          total: payload.total,
          loading: false,
          loaded: true
        }
      }));
    } catch {
      setDetailCache((cache) => ({
        ...cache,
        [key]: {
          details: [],
          total: 0,
          loading: false,
          loaded: true,
          error: "Não foi possível carregar os detalhes agora."
        }
      }));
    }
  };

  const toggleExpanded = (cardId: string, kind: DashboardDetailKind) => {
    const willClose = expanded?.cardId === cardId && expanded.kind === kind;
    setExpanded(willClose ? null : { cardId, kind });

    if (!willClose) {
      void loadDetails(cardId, kind);
    }
  };

  return (
    <div className="space-y-5 dark:text-slate-100">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mainCards.map((card) => (
          <SummaryCard
            key={card.id}
            card={card}
            expanded={expanded}
            detailsState={
              expanded?.cardId === card.id
                ? detailCache[
                    detailCacheKey(
                      data.period,
                      card.id,
                      expanded.kind,
                      data.customStartDate,
                      data.customEndDate
                    )
                  ]
                : undefined
            }
            onToggle={toggleExpanded}
          />
        ))}
      </section>

      <ModuleSummaryGrid modules={moduleSnapshots} />
    </div>
  );
}
