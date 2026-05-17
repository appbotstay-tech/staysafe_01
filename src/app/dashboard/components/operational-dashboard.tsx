"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  DashboardData,
  DashboardDetailsResponse,
  DashboardDetailItem,
  DashboardDetailKind,
  DashboardAlertSeverity,
  DashboardInsightDetailsResponse,
  DashboardInsightId,
  DashboardInsightItem,
  DashboardInsightSummary,
  DashboardModuleSummary,
  DashboardNormalizedStatus,
  DashboardPeriod,
  DashboardSummaryCard
} from "../types";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana Atual" },
  { value: "mes", label: "Mês Atual" }
];

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

type InsightLoadState = {
  details: DashboardInsightItem[];
  total: number;
  loading: boolean;
  loaded: boolean;
  error?: string;
};

function detailCacheKey(
  period: DashboardPeriod,
  cardId: string,
  kind: DashboardDetailKind
): string {
  return `${period}:${cardId}:${kind}`;
}

function insightCacheKey(period: DashboardPeriod, sectionId: DashboardInsightId): string {
  return `${period}:${sectionId}`;
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

function severityBadgeClass(severity: DashboardAlertSeverity): string {
  if (severity === "Crítico") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (severity === "Atenção") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function moduleStatusClass(status: DashboardModuleSummary["status"]): string {
  if (status === "Concluído") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === "Parcial") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }

  if (status === "Sem dados") {
    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

function groupDetails(details: Array<DashboardDetailItem | DashboardInsightItem>) {
  const grouped = new Map<string, Array<DashboardDetailItem | DashboardInsightItem>>();

  for (const detail of details) {
    grouped.set(detail.moduleName, [...(grouped.get(detail.moduleName) ?? []), detail]);
  }

  return Array.from(grouped.entries());
}

function isInsightItem(
  item: DashboardDetailItem | DashboardInsightItem
): item is DashboardInsightItem {
  return "severity" in item;
}

function DetailList({
  details,
  emptyText
}: {
  details: Array<DashboardDetailItem | DashboardInsightItem>;
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
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {item.responsible ? <span>{item.responsible}</span> : null}
                      {item.dateTime ? <span>{item.dateTime}</span> : null}
                      {isInsightItem(item) ? <span>{item.occurrenceType}</span> : null}
                      {isInsightItem(item) && item.correctiveAction ? (
                        <span>Ação: {item.correctiveAction}</span>
                      ) : null}
                      {isInsightItem(item) ? (
                        <span>{item.hasEvidence ? "Com evidência" : "Sem evidência"}</span>
                      ) : null}
                      {isInsightItem(item) && item.relatedTicketStatus ? (
                        <span>Chamado: {item.relatedTicketStatus}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isInsightItem(item) ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityBadgeClass(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <Link href={item.href} className="btn-secondary">
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
    <article className="bpma-card-compact flex min-h-[18rem] flex-col gap-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {card.title}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {card.description}
            </p>
          </div>
          {card.href && card.href !== "/" ? (
            <Link href={card.href} className="btn-secondary shrink-0 px-3 py-2 text-xs">
              Abrir
            </Link>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
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
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${card.percentCompleted}%` }}
            />
          </div>
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
          <span className="text-xs">{card.percentPending}% pendentes</span>
        </button>
      </div>

      <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {card.waitingResponsible ? (
          <span>{card.waitingResponsible} aguardando responsável</span>
        ) : null}
        {card.waitingSupervisor ? (
          <span>{card.waitingSupervisor} aguardando supervisor</span>
        ) : null}
        {card.inProgress ? <span>{card.inProgress} em andamento</span> : null}
      </div>

      {expandedKind ? (
        <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {expandedKind === "completed" ? "Tarefas concluídas" : "Pendências encontradas"}
            </h3>
            <button
              type="button"
              onClick={() => onToggle(card.id, expandedKind)}
              className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
            >
              Recolher
            </button>
          </div>
          {detailsState?.loading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Carregando detalhes...
            </p>
          ) : detailsState?.error ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {detailsState.error}
            </p>
          ) : expandedTotal > expandedDetails.length ? (
            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Mostrando {expandedDetails.length} de {expandedTotal} itens. Use Abrir para ver o
              módulo completo.
            </p>
          ) : null}
          {!detailsState?.loading && !detailsState?.error ? (
            <DetailList
              details={expandedDetails}
              emptyText={
                expandedKind === "completed"
                  ? "Nenhuma tarefa concluída neste grupo."
                  : "Nenhuma pendência neste grupo."
              }
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function InsightDetails({
  summary,
  state,
  onClose
}: {
  summary: DashboardInsightSummary;
  state?: InsightLoadState;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Detalhes
        </h3>
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
      ) : state && state.total > state.details.length ? (
        <div>
          <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Mostrando {state.details.length} de {state.total} itens. Use Abrir para ver o
            módulo completo.
          </p>
          <DetailList
            details={state.details}
            emptyText={`Nenhum detalhe para ${summary.title.toLocaleLowerCase("pt-BR")}.`}
          />
        </div>
      ) : (
        <DetailList
          details={state?.details ?? []}
          emptyText={`Nenhum detalhe para ${summary.title.toLocaleLowerCase("pt-BR")}.`}
        />
      )}
    </div>
  );
}

function RiskOverviewCard({
  summary,
  expanded,
  detailsState,
  onToggle
}: {
  summary: DashboardInsightSummary;
  expanded: boolean;
  detailsState?: InsightLoadState;
  onToggle: (sectionId: DashboardInsightId) => void;
}) {
  const level = summary.level ?? "Informativo";

  return (
    <section className="bpma-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Risco Operacional
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {summary.status ?? "Operação em dia"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {summary.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${severityBadgeClass(
              level
            )}`}
          >
            {level}
          </span>
          <button type="button" onClick={() => onToggle(summary.id)} className="btn-secondary">
            Ver fatores
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <p className="text-2xl font-bold">{summary.critical}</p>
          <p className="text-xs">críticos</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="text-2xl font-bold">{summary.attention}</p>
          <p className="text-xs">atenção</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <p className="text-2xl font-bold">{summary.informative}</p>
          <p className="text-xs">informativos</p>
        </div>
      </div>

      {expanded ? (
        <InsightDetails
          summary={summary}
          state={detailsState}
          onClose={() => onToggle(summary.id)}
        />
      ) : null}
    </section>
  );
}

function InsightSummaryCard({
  summary,
  expanded,
  detailsState,
  onToggle
}: {
  summary: DashboardInsightSummary;
  expanded: boolean;
  detailsState?: InsightLoadState;
  onToggle: (sectionId: DashboardInsightId) => void;
}) {
  return (
    <article className="bpma-card-compact">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {summary.title}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {summary.description}
          </p>
        </div>
        <button type="button" onClick={() => onToggle(summary.id)} className="btn-secondary">
          Detalhar
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <span className="block text-lg font-semibold">{summary.critical}</span>
          <span className="text-xs">crítico</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span className="block text-lg font-semibold">{summary.attention}</span>
          <span className="text-xs">atenção</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <span className="block text-lg font-semibold">{summary.total}</span>
          <span className="text-xs">total</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {summary.withCorrectiveAction ? (
          <span>{summary.withCorrectiveAction} com ação corretiva</span>
        ) : null}
        {summary.withoutCorrectiveAction ? (
          <span>{summary.withoutCorrectiveAction} sem ação corretiva</span>
        ) : null}
        {summary.resolved ? <span>{summary.resolved} concluídos/cancelados</span> : null}
      </div>

      {expanded ? (
        <InsightDetails
          summary={summary}
          state={detailsState}
          onClose={() => onToggle(summary.id)}
        />
      ) : null}
    </article>
  );
}

function EvolutionSection({ metrics }: { metrics: DashboardData["evolution"] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Evolução do Período
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Leitura rápida dos principais indicadores do período selecionado.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.id} className="bpma-card-compact">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {metric.label}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(
                  metric.severity
                )}`}
              >
                {metric.severity}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {metric.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MyPendenciesSection({ details }: { details: DashboardDetailItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Minhas Pendências
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Itens priorizados conforme o perfil logado.
        </p>
      </div>
      <DetailList
        details={details}
        emptyText="Nenhuma pendência prioritária para o seu perfil neste período."
      />
    </section>
  );
}

function ModuleSummaryCard({ moduleSummary }: { moduleSummary: DashboardModuleSummary }) {
  return (
    <Link href={moduleSummary.href} className="bpma-clickable-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
          {moduleSummary.name}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${moduleStatusClass(
            moduleSummary.status
          )}`}
        >
          {moduleSummary.status}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        {moduleSummary.completed} concluídos | {moduleSummary.pending} pendentes
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {moduleSummary.percentCompleted}% concluído
      </p>
      {moduleSummary.note ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {moduleSummary.note}
        </p>
      ) : null}
    </Link>
  );
}

export function OperationalDashboard({ data }: OperationalDashboardProps) {
  const [expanded, setExpanded] = useState<ExpandedState>(null);
  const [detailCache, setDetailCache] = useState<Record<string, DetailLoadState>>({});
  const [expandedInsight, setExpandedInsight] = useState<DashboardInsightId | null>(null);
  const [insightCache, setInsightCache] = useState<Record<string, InsightLoadState>>({});

  const loadDetails = async (cardId: string, kind: DashboardDetailKind) => {
    const key = detailCacheKey(data.period, cardId, kind);
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

  const loadInsightDetails = async (sectionId: DashboardInsightId) => {
    const key = insightCacheKey(data.period, sectionId);
    const current = insightCache[key];

    if (current?.loaded || current?.loading) {
      return;
    }

    setInsightCache((cache) => ({
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
        sectionId
      });
      const response = await fetch(`/api/dashboard/insights?${query.toString()}`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar detalhes.");
      }

      const payload = (await response.json()) as DashboardInsightDetailsResponse;
      setInsightCache((cache) => ({
        ...cache,
        [key]: {
          details: payload.details,
          total: payload.total,
          loading: false,
          loaded: true
        }
      }));
    } catch {
      setInsightCache((cache) => ({
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

  const toggleInsight = (sectionId: DashboardInsightId) => {
    const willClose = expandedInsight === sectionId;
    setExpandedInsight(willClose ? null : sectionId);

    if (!willClose) {
      void loadInsightDetails(sectionId);
    }
  };

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className="bpma-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              BPMA App
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
              {data.profileView.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {data.profileView.subtitle}
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Atualizado em {data.generatedAt}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`/?period=${option.value}`}
                className={data.period === option.value ? "btn-primary" : "btn-secondary"}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {data.riskOverview ? (
        <RiskOverviewCard
          summary={data.riskOverview}
          expanded={expandedInsight === data.riskOverview.id}
          detailsState={
            expandedInsight === data.riskOverview.id
              ? insightCache[insightCacheKey(data.period, data.riskOverview.id)]
              : undefined
          }
          onToggle={toggleInsight}
        />
      ) : null}

      <EvolutionSection metrics={data.evolution} />

      <section className="grid gap-4 xl:grid-cols-2">
        {data.cards.map((card) => (
          <SummaryCard
            key={card.id}
            card={card}
            expanded={expanded}
            detailsState={
              expanded?.cardId === card.id
                ? detailCache[detailCacheKey(data.period, card.id, expanded.kind)]
                : undefined
            }
            onToggle={toggleExpanded}
          />
        ))}
      </section>

      {data.insightSummaries.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Alertas e Indicadores Preventivos
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Não conformidades, ações corretivas e alertas calculados a partir dos módulos.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {data.insightSummaries.map((summary) => (
              <InsightSummaryCard
                key={summary.id}
                summary={summary}
                expanded={expandedInsight === summary.id}
                detailsState={
                  expandedInsight === summary.id
                    ? insightCache[insightCacheKey(data.period, summary.id)]
                    : undefined
                }
                onToggle={toggleInsight}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Pendências por Módulo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Diário: {data.scope.daily} | Semanal: {data.scope.weekly} | Mensal:{" "}
            {data.scope.monthly}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.moduleSummaries.map((module) => (
            <ModuleSummaryCard key={module.id} moduleSummary={module} />
          ))}
        </div>
      </section>

      <MyPendenciesSection details={data.myPendencies} />
    </div>
  );
}
