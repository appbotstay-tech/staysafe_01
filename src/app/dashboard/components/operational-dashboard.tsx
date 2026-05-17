"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  DashboardData,
  DashboardDetailItem,
  DashboardDetailKind,
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
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
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
  onToggle
}: {
  card: DashboardSummaryCard;
  expanded: ExpandedState;
  onToggle: (cardId: string, kind: DashboardDetailKind) => void;
}) {
  const expandedKind = expanded?.cardId === card.id ? expanded.kind : null;
  const expandedDetails =
    expandedKind === "completed" ? card.completedDetails : card.pendingDetails;

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
          <DetailList
            details={expandedDetails}
            emptyText={
              expandedKind === "completed"
                ? "Nenhuma tarefa concluída neste grupo."
                : "Nenhuma pendência neste grupo."
            }
          />
        </div>
      ) : null}
    </article>
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

function ModuleSummaryCard({ module }: { module: DashboardModuleSummary }) {
  return (
    <Link href={module.href} className="bpma-clickable-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
          {module.name}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${moduleStatusClass(
            module.status
          )}`}
        >
          {module.status}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        {module.pending} pendentes | {module.completed} concluídos
      </p>
      {module.note ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{module.note}</p>
      ) : null}
    </Link>
  );
}

export function OperationalDashboard({ data }: OperationalDashboardProps) {
  const [expanded, setExpanded] = useState<ExpandedState>(null);

  const toggleExpanded = (cardId: string, kind: DashboardDetailKind) => {
    setExpanded((current) =>
      current?.cardId === cardId && current.kind === kind ? null : { cardId, kind }
    );
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

      <section className="grid gap-4 xl:grid-cols-2">
        {data.cards.map((card) => (
          <SummaryCard
            key={card.id}
            card={card}
            expanded={expanded}
            onToggle={toggleExpanded}
          />
        ))}
      </section>

      <MyPendenciesSection details={data.myPendencies} />

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
            <ModuleSummaryCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  );
}
