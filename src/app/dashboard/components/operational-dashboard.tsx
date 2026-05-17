"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  DashboardAlertSeverity,
  DashboardData,
  DashboardDetailItem,
  DashboardDetailKind,
  DashboardDetailsResponse,
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

type InsightLoadState = {
  details: DashboardInsightItem[];
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
  kind: DashboardDetailKind
): string {
  return `${period}:${cardId}:${kind}`;
}

function insightCacheKey(period: DashboardPeriod, sectionId: DashboardInsightId): string {
  return `${period}:${sectionId}`;
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

function severityBadgeClass(severity: DashboardAlertSeverity): string {
  if (severity === "Crítico") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  if (severity === "Atenção") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
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
                      {isInsightItem(item) && typeof item.hasEvidence === "boolean" ? (
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
    <article className="bpma-card-compact flex flex-col gap-3">
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

      <div>
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
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${card.percentCompleted}%` }}
          />
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
          Fatores do status
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
          Carregando fatores...
        </p>
      ) : state?.error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {state.error}
        </p>
      ) : state && state.total > state.details.length ? (
        <div>
          <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Mostrando {state.details.length} de {state.total} fatores.
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

function buildRiskReasons(summary: DashboardInsightSummary, modules: ModuleSnapshot[]): string[] {
  const reasons: string[] = [];
  const modulesWithPending = modules
    .filter((moduleSnapshot) => moduleSnapshot.pending > 0)
    .sort((left, right) => right.pending - left.pending);

  for (const moduleSnapshot of modulesWithPending) {
    reasons.push(`${moduleSnapshot.pending} pendência(s) em ${moduleSnapshot.name}`);
  }

  if (summary.critical > 0) {
    reasons.push(`${summary.critical} ocorrência(s) crítica(s)`);
  }

  if (summary.attention > 0) {
    reasons.push(`${summary.attention} alerta(s) de atenção`);
  }

  return reasons.length > 0 ? reasons.slice(0, 3) : ["Sem fatores críticos no período."];
}

function CompactRiskCard({
  summary,
  modules,
  expanded,
  detailsState,
  onToggle
}: {
  summary: DashboardInsightSummary;
  modules: ModuleSnapshot[];
  expanded: boolean;
  detailsState?: InsightLoadState;
  onToggle: (sectionId: DashboardInsightId) => void;
}) {
  const level = summary.level ?? "Informativo";
  const reasons = buildRiskReasons(summary, modules);

  return (
    <section className="bpma-card-compact">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Status da Operação
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {summary.status ?? "Operação em dia"}
            </h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityBadgeClass(
                level
              )}`}
            >
              {level}
            </span>
          </div>
        </div>
        <button type="button" onClick={() => onToggle(summary.id)} className="btn-secondary">
          Ver fatores
        </button>
      </div>

      <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 lg:grid-cols-3">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            {reason}
          </li>
        ))}
      </ul>

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

function ModuleBarChart({ modules }: { modules: ModuleSnapshot[] }) {
  return (
    <section className="bpma-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Resumo por Módulo
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Concluídos e pendentes no período selecionado.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Concluídos
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Pendentes
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {modules.map((moduleSnapshot) => {
          const completedWidth = moduleSnapshot.total > 0 ? moduleSnapshot.percentCompleted : 0;
          const pendingWidth = moduleSnapshot.total > 0 ? 100 - completedWidth : 0;

          return (
            <div
              key={moduleSnapshot.id}
              className="grid gap-2 lg:grid-cols-[16rem_1fr_9rem] lg:items-center"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {moduleSnapshot.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {moduleSnapshot.percentCompleted}% concluído
                </p>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${completedWidth}%` }}
                />
                <div className="h-full bg-amber-500" style={{ width: `${pendingWidth}%` }} />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 lg:text-right">
                {moduleSnapshot.completed} concl. | {moduleSnapshot.pending} pend.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleSituationList({ modules }: { modules: ModuleSnapshot[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Situação por Módulo
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Resumo compacto para decidir onde aprofundar.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((moduleSnapshot) => (
          <article key={moduleSnapshot.id} className="bpma-card-compact flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
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
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {moduleSnapshot.pending} pendência(s)
            </p>
            <Link href={moduleSnapshot.href} className="btn-secondary w-fit">
              Abrir
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompactMyPendenciesCard({
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
  const isExpanded = expanded?.cardId === card.id && expanded.kind === "pending";
  const waitingSignatures = (card.waitingResponsible ?? 0) + (card.waitingSupervisor ?? 0);

  return (
    <section className="bpma-card-compact">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Minhas Pendências
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Resumo das tarefas que podem precisar da sua ação.
          </p>
        </div>
        <button type="button" onClick={() => onToggle(card.id, "pending")} className="btn-primary">
          Ver minhas tarefas
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.pending}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">pendências no total</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="text-2xl font-bold">{waitingSignatures}</p>
          <p className="text-xs">aguardando assinatura</p>
        </div>
      </div>

      {isExpanded ? (
        <CardDetails
          title="Minhas tarefas"
          state={detailsState}
          total={detailsState?.total ?? card.pending}
          details={detailsState?.details ?? []}
          emptyText="Nenhuma pendência prioritária para o seu perfil neste período."
          onClose={() => onToggle(card.id, "pending")}
        />
      ) : null}
    </section>
  );
}

function EmployeeShortcuts({ modules }: { modules: ModuleSnapshot[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Atalhos Operacionais
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((moduleSnapshot) => (
          <Link
            key={moduleSnapshot.id}
            href={moduleSnapshot.href}
            className="bpma-clickable-card p-4"
          >
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              {moduleSnapshot.name}
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Abrir módulo
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OperationalDashboard({ data }: OperationalDashboardProps) {
  const [expanded, setExpanded] = useState<ExpandedState>(null);
  const [detailCache, setDetailCache] = useState<Record<string, DetailLoadState>>({});
  const [expandedInsight, setExpandedInsight] = useState<DashboardInsightId | null>(null);
  const [insightCache, setInsightCache] = useState<Record<string, InsightLoadState>>({});

  const moduleSnapshots = useMemo(
    () => buildModuleSnapshots(data.moduleSummaries),
    [data.moduleSummaries]
  );
  const isManagementView = data.profileView.showManagement;
  const mainCards = data.cards.filter((card) => MAIN_CARD_IDS.has(card.id));
  const myPendenciesCard = data.cards.find((card) => card.id === "minhas-pendencias");

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
    <div className="space-y-5 dark:text-slate-100">
      <section className="bpma-card-compact">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {data.profileView.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {data.profileView.subtitle}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {data.periodLabel} | Atualizado em {data.generatedAt}
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

      {isManagementView && data.riskOverview ? (
        <CompactRiskCard
          summary={data.riskOverview}
          modules={moduleSnapshots}
          expanded={expandedInsight === data.riskOverview.id}
          detailsState={
            expandedInsight === data.riskOverview.id
              ? insightCache[insightCacheKey(data.period, data.riskOverview.id)]
              : undefined
          }
          onToggle={toggleInsight}
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mainCards.map((card) => (
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

      {myPendenciesCard ? (
        <CompactMyPendenciesCard
          card={myPendenciesCard}
          expanded={expanded}
          detailsState={
            expanded?.cardId === myPendenciesCard.id
              ? detailCache[detailCacheKey(data.period, myPendenciesCard.id, expanded.kind)]
              : undefined
          }
          onToggle={toggleExpanded}
        />
      ) : null}

      {isManagementView ? <ModuleBarChart modules={moduleSnapshots} /> : null}

      {isManagementView ? (
        <ModuleSituationList modules={moduleSnapshots} />
      ) : (
        <EmployeeShortcuts modules={moduleSnapshots} />
      )}
    </div>
  );
}
