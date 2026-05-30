import { Prisma, StatusPlanoLimpeza } from "@prisma/client";
import Link from "next/link";

import { MonthlyClosureSection } from "@/components/historico/technical-signature";
import { getCurrentUser } from "@/lib/auth-session";
import {
  formatAppDateInput,
  getAppDate,
  getAppMonthDateRange,
  getAppMonthYear
} from "@/lib/date-time";
import { canSignModuleMonthlyClosure } from "@/lib/module-signatures";
import { prisma } from "@/lib/prisma";

import { MONTH_OPTIONS, WEEKLY_STATUS_OPTIONS } from "../../constants";
import { consolidateWeeklyExecutionsByAreaWeek } from "../../service";
import { StatusBadge } from "../../status-badge";
import {
  formatDateDisplay,
  formatDateInput,
  formatWeeklyExecutionQuando,
  getWeekDateRangeForDate,
  getMonthDateRange,
  getYearDateRange,
  parseDateInput,
  parsePositiveInt,
  parseWeeklyStatus
} from "../../utils";
import { WeeklyChecklistSync } from "../weekly-checklist-sync";

const PAGE_PATH = "/plano-limpeza/semanal/historico";
const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";
const MODULE_CODE = "limpeza_semanal";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPathWithParams(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${PAGE_PATH}?${query}` : PAGE_PATH;
}

function includesIgnoreCase(text: string, search: string): boolean {
  return text.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
}

function getWeeklyRecordStatus(record: {
  status: StatusPlanoLimpeza;
  assinaturaResponsavel: string;
  assinaturaSupervisor: string;
}): StatusPlanoLimpeza {
  if (record.assinaturaResponsavel.trim() && record.assinaturaSupervisor.trim()) {
    return StatusPlanoLimpeza.CONCLUIDO;
  }

  if (record.assinaturaResponsavel.trim()) {
    return StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR;
  }

  return record.status;
}

export default async function PlanoLimpezaSemanalHistoricoPage({
  searchParams
}: PageProps) {
  const authUser = await getCurrentUser();
  const canSignMonthly = authUser ? canSignModuleMonthlyClosure(authUser, MODULE_CODE) : false;

  const params = await searchParams;
  const filtroData = firstParam(params.filtroData).trim();
  const filtroMes = parsePositiveInt(firstParam(params.filtroMes).trim());
  const filtroAno = parsePositiveInt(firstParam(params.filtroAno).trim());
  const filtroArea = firstParam(params.filtroArea).trim();
  const filtroStatus = parseWeeklyStatus(firstParam(params.filtroStatus).trim());
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const filtroItem = firstParam(params.filtroItem).trim();
  const todayMonth = getAppMonthYear(getAppDate());
  const selectedMonth = filtroMes && filtroMes <= 12 ? filtroMes : todayMonth.mes;
  const selectedYear = filtroAno ?? todayMonth.ano;
  const selectedMonthRange = getAppMonthDateRange(selectedMonth, selectedYear);

  const where: Prisma.PlanoLimpezaSemanalExecucaoWhereInput = {};
  const dataFiltro = parseDateInput(filtroData);
  if (dataFiltro) {
    const weekRange = getWeekDateRangeForDate(dataFiltro);
    where.dataExecucao = { gte: weekRange.start, lte: weekRange.end };
  } else if (filtroMes && filtroAno && filtroMes <= 12) {
    const range = getMonthDateRange(filtroMes, filtroAno);
    where.dataExecucao = { gte: range.start, lte: range.end };
  } else if (filtroAno) {
    const range = getYearDateRange(filtroAno);
    where.dataExecucao = { gte: range.start, lte: range.end };
  }

  let syncRange: { start: Date; end: Date } | null = null;
  if (dataFiltro) {
    syncRange = getWeekDateRangeForDate(dataFiltro);
  } else if (filtroMes && filtroAno && filtroMes <= 12) {
    syncRange = getMonthDateRange(filtroMes, filtroAno);
  }
  const syncStart = syncRange ? formatDateInput(syncRange.start) : null;
  const syncEnd = syncRange ? formatDateInput(syncRange.end) : null;

  const [rawRecords, rawMonthlyRecords, allItems, weeklyAreas, areasHistoricas, fechamentoMensal] = await Promise.all([
    prisma.planoLimpezaSemanalExecucao.findMany({
      where,
      select: {
        id: true,
        dataExecucao: true,
        area: true,
        assinaturaResponsavel: true,
        assinaturaResponsavelDataHora: true,
        assinaturaSupervisor: true,
        status: true,
        observacaoResponsavel: true,
        observacaoSupervisor: true,
        itemDescricao: true,
        qualProduto: true,
        quando: true,
        setorResponsavel: true,
        funcionarioResponsavel: true,
        item: {
          select: {
            oQueLimpar: true,
            qualProduto: true,
            quando: true,
            setorResponsavel: true,
            quem: true
          }
        }
      },
      orderBy: [{ dataExecucao: "desc" }, { createdAt: "desc" }]
    }),
    prisma.planoLimpezaSemanalExecucao.findMany({
      where: {
        dataExecucao: {
          gte: selectedMonthRange.start,
          lte: selectedMonthRange.end
        }
      },
      select: {
        id: true,
        dataExecucao: true,
        area: true,
        assinaturaResponsavel: true,
        assinaturaResponsavelDataHora: true,
        assinaturaSupervisor: true,
        status: true,
        observacaoResponsavel: true,
        observacaoSupervisor: true,
        itemDescricao: true,
        qualProduto: true,
        quando: true,
        setorResponsavel: true,
        funcionarioResponsavel: true,
        item: {
          select: {
            oQueLimpar: true,
            qualProduto: true,
            quando: true,
            setorResponsavel: true,
            quem: true
          }
        }
      },
      orderBy: [{ dataExecucao: "desc" }, { createdAt: "desc" }]
    }),
    prisma.planoLimpezaSemanalItem.findMany({
      orderBy: [{ area: "asc" }, { ordem: "asc" }, { oQueLimpar: "asc" }]
    }),
    prisma.planoLimpezaSemanalArea.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.planoLimpezaSemanalExecucao.findMany({
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" }
    }),
    prisma.fechamentoMensalModulo.findUnique({
      where: {
        moduloCodigo_ano_mes: {
          moduloCodigo: MODULE_CODE,
          ano: selectedYear,
          mes: selectedMonth
        }
      }
    })
  ]);

  const activeAreaNames = new Set(
    weeklyAreas.filter((area) => area.ativo && !area.excluidoEm).map((area) => area.nome)
  );
  const activeItems = allItems.filter(
    (item) => item.ativo && !item.excluidoEm && activeAreaNames.has(item.area)
  );

  const summariesAll = consolidateWeeklyExecutionsByAreaWeek(rawRecords);
  const monthlySummaries = consolidateWeeklyExecutionsByAreaWeek(rawMonthlyRecords);
  const filteredByItemAreas =
    filtroItem.trim().length > 0
      ? new Set(
          allItems
            .filter((item) => includesIgnoreCase(item.oQueLimpar, filtroItem))
            .map((item) => item.area)
        )
      : null;

  const summaries = summariesAll.filter((summary) => {
    if (filtroArea && summary.area !== filtroArea) {
      return false;
    }
    if (filtroStatus && summary.status !== filtroStatus) {
      return false;
    }
    if (filtroResponsavel && !includesIgnoreCase(summary.assinaturaResponsavel, filtroResponsavel)) {
      return false;
    }
    if (filteredByItemAreas && !filteredByItemAreas.has(summary.area)) {
      return false;
    }

    return true;
  });

  const filteredRecords = rawRecords.filter((record) => {
    const itemNome = record.itemDescricao ?? record.item.oQueLimpar;
    if (filtroArea && record.area !== filtroArea) {
      return false;
    }
    if (filtroStatus && getWeeklyRecordStatus(record) !== filtroStatus) {
      return false;
    }
    if (filtroResponsavel && !includesIgnoreCase(record.assinaturaResponsavel, filtroResponsavel)) {
      return false;
    }
    if (filtroItem && !includesIgnoreCase(itemNome, filtroItem)) {
      return false;
    }
    return true;
  });

  const observacoesPorAreaSemana = new Map<string, number>();
  for (const record of rawRecords) {
    const weekRange = getWeekDateRangeForDate(record.dataExecucao);
    const key = `${record.area}|${formatDateInput(weekRange.start)}`;
    const hasObservation = Boolean(
      (record.observacaoResponsavel && record.observacaoResponsavel.trim()) ||
        (record.observacaoSupervisor && record.observacaoSupervisor.trim())
    );
    if (!hasObservation) {
      continue;
    }

    observacoesPorAreaSemana.set(key, (observacoesPorAreaSemana.get(key) ?? 0) + 1);
  }

  const areaOptions = Array.from(
    new Set([
      ...weeklyAreas.filter((area) => !area.excluidoEm).map((area) => area.nome),
      ...allItems.map((item) => item.area),
      ...areasHistoricas.map((item) => item.area)
    ])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const monthlyDates = Array.from(
    new Map(
      rawMonthlyRecords.map((record) => [
        formatAppDateInput(record.dataExecucao),
        record.dataExecucao
      ])
    ).values()
  );
  const assinaturasMensais = monthlyDates.length
    ? await prisma.assinaturaDiariaModulo.findMany({
        where: {
          moduloCodigo: MODULE_CODE,
          dataReferencia: { in: monthlyDates }
        }
      })
    : [];
  const diasExecutados = new Set(
    rawMonthlyRecords.map((record) => formatAppDateInput(record.dataExecucao))
  );
  const diasAssinados = new Set(
    assinaturasMensais.map((assinatura) => formatAppDateInput(assinatura.dataReferencia))
  );
  const indicadoresMensais = {
    "Mês/Ano": `${String(selectedMonth).padStart(2, "0")}/${selectedYear}`,
    "Semanas do mês": new Set(
      monthlySummaries.map((summary) => formatDateInput(summary.weekStart))
    ).size,
    "Áreas previstas": monthlySummaries.length,
    "Áreas concluídas": monthlySummaries.filter(
      (summary) => summary.statusGeral === "Concluído"
    ).length,
    "Pendências": monthlySummaries.reduce(
      (total, summary) => total + summary.pendingItems,
      0
    ),
    "Execuções realizadas": rawMonthlyRecords.length,
    "Dias assinados": diasAssinados.size,
    "Dias pendentes de assinatura": Math.max(diasExecutados.size - diasAssinados.size, 0)
  };
  const monthlyReturnParams = new URLSearchParams();
  if (filtroMes) monthlyReturnParams.set("filtroMes", String(filtroMes));
  if (filtroAno) monthlyReturnParams.set("filtroAno", String(filtroAno));
  const monthlyReturnTo = buildPathWithParams(monthlyReturnParams);

  return (
    <div className="space-y-6 dark:text-slate-100">
      <WeeklyChecklistSync
        startDate={syncStart}
        endDate={syncEnd}
        enabled={activeItems.length > 0 && Boolean(syncStart && syncEnd)}
      />

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Histórico do Plano Semanal
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Visualização histórica por área, com detalhamento interno dos itens configurados.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/plano-limpeza/semanal" className="btn-secondary">
              ← Voltar ao Módulo
            </Link>
          </div>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Filtros</h2>
        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 dark:bg-slate-800">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data
            <input type="date" name="filtroData" defaultValue={filtroData} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Mês
            <select name="filtroMes" defaultValue={filtroMes ? String(filtroMes) : ""} className={INPUT_CLASS}>
              <option value="">Todos</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={String(month.value)}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Ano
            <input type="number" name="filtroAno" min={2020} max={2100} defaultValue={filtroAno ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Área
            <select name="filtroArea" defaultValue={filtroArea} className={INPUT_CLASS}>
              <option value="">Todas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="filtroStatus" defaultValue={filtroStatus ?? ""} className={INPUT_CLASS}>
              <option value="">Todos</option>
              {WEEKLY_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Responsável
            <input type="text" name="filtroResponsavel" defaultValue={filtroResponsavel} className={INPUT_CLASS} />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-3">
            Item
            <input type="text" name="filtroItem" defaultValue={filtroItem} className={INPUT_CLASS} />
          </label>

          <div className="btn-group md:col-span-6">
            <button type="submit" className="btn-primary">
              Aplicar Filtros
            </button>
            <Link href={PAGE_PATH} className="btn-secondary">
              Limpar
            </Link>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Execuções por Área ({summaries.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Semana</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Itens Configurados</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Supervisor</th>
                <th className="px-3 py-2">Observações</th>
                <th className="px-3 py-2">Status Geral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhuma execução encontrada.
                  </td>
                </tr>
              ) : (
                summaries.map((summary) => (
                  <tr key={`${summary.area}-${formatDateInput(summary.weekStart)}`}>
                    <td className="px-3 py-2">
                      {formatDateDisplay(summary.weekStart)} até {formatDateDisplay(summary.weekEnd)}
                    </td>
                    <td className="px-3 py-2">{summary.area}</td>
                    <td className="px-3 py-2">{summary.totalRegistrosOriginais}</td>
                    <td className="px-3 py-2">{summary.assinaturaResponsavel || "-"}</td>
                    <td className="px-3 py-2">{summary.assinaturaSupervisor || "-"}</td>
                    <td className="px-3 py-2">
                      {(observacoesPorAreaSemana.get(
                        `${summary.area}|${formatDateInput(summary.weekStart)}`
                      ) ?? 0) || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={summary.statusGeral} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Itens/Locais Executados ({filteredRecords.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Semana</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">O que limpar</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Setor</th>
                <th className="px-3 py-2">Funcionário</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Supervisor</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhum item/local encontrado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-3 py-2">{formatDateDisplay(record.dataExecucao)}</td>
                      <td className="px-3 py-2">{record.area}</td>
                      <td className="px-3 py-2">{record.itemDescricao ?? record.item.oQueLimpar}</td>
                      <td className="px-3 py-2">{record.qualProduto ?? record.item.qualProduto}</td>
                      <td className="px-3 py-2">
                        {formatWeeklyExecutionQuando({
                          assinaturaResponsavel: record.assinaturaResponsavel,
                          assinaturaResponsavelDataHora: record.assinaturaResponsavelDataHora,
                          quando: record.quando
                        })}
                      </td>
                      <td className="px-3 py-2">{record.setorResponsavel ?? record.item.setorResponsavel ?? "-"}</td>
                      <td className="px-3 py-2">{record.funcionarioResponsavel ?? record.item.quem}</td>
                      <td className="px-3 py-2">{record.assinaturaResponsavel || "-"}</td>
                      <td className="px-3 py-2">{record.assinaturaSupervisor || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={getWeeklyRecordStatus(record)} />
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <MonthlyClosureSection
        moduleCode={MODULE_CODE}
        month={selectedMonth}
        year={selectedYear}
        returnTo={monthlyReturnTo}
        indicators={indicadoresMensais}
        signedClosure={fechamentoMensal}
        canSign={canSignMonthly}
        pendingDailySignatures={indicadoresMensais["Dias pendentes de assinatura"]}
      />
    </div>
  );
}
