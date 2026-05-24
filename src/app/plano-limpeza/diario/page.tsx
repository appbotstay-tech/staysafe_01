import {
  ModuloDocumento,
  Prisma,
  StatusFechamentoPlanoLimpeza,
  TipoPlanoLimpeza
} from "@prisma/client";
import Link from "next/link";

import { SignatureContextCard } from "@/components/auth/signature-context-card";
import { DocumentosModuleHeader } from "@/components/documentos/documentos-module-header";
import { ActionModal } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  canCloseMonth,
  canManageModuleOptions,
  canReopenMonth,
  canViewManagementSections,
  getRoleLabel
} from "@/lib/rbac";

import { closeDailyMonthAction, reopenDailyMonthAction } from "../actions";
import { DAILY_STATUS_OPTIONS, MONTH_OPTIONS } from "../constants";
import { ReopenMonthModal } from "../reopen-month-modal";
import {
  consolidateDailyRecordsByDay,
  getDailyConsolidatedStatusClass,
  getDailySignStage
} from "../service";
import { StatusBadge } from "../status-badge";
import {
  formatDateDisplay,
  formatDateInput,
  formatDateTimeDisplay,
  getCurrentSystemDateTime,
  getMonthDateRange,
  getMonthYear,
  getTodaySystemDate,
  getYearDateRange,
  parseDailyStatus,
  parseDateInput,
  parsePositiveInt,
  periodKey
} from "../utils";
import { DailyChecklistSync } from "./daily-checklist-sync";
import { DailySignChecklistModal } from "./sign-checklist-modal";

const PAGE_PATH = "/plano-limpeza/diario";
const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";

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

type DailyAreaStatus = "Pendente" | "Parcial" | "Concluída";

function getDailyItemDescription(record: {
  itemDescricao: string | null;
  area: string;
}): string {
  return record.itemDescricao?.trim() || record.area;
}

function getDailyAreaStatus(totalItems: number, signedItems: number): DailyAreaStatus {
  if (totalItems > 0 && signedItems === totalItems) {
    return "Concluída";
  }

  if (signedItems > 0) {
    return "Parcial";
  }

  return "Pendente";
}

export default async function PlanoLimpezaDiarioPage({ searchParams }: PageProps) {
  const authUser = await getCurrentUser();
  const responsavelLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const usuarioLogadoId = authUser?.id ?? null;
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const isColaborador = authUser?.perfil === "COLABORADOR";
  const podeVerGestao = authUser ? canViewManagementSections(authUser.perfil) : false;
  const podeGerenciarOpcoes = authUser ? canManageModuleOptions(authUser.perfil) : false;
  const podeFechar = authUser ? canCloseMonth(authUser.perfil) : false;
  const podeReabrir = authUser ? canReopenMonth(authUser.perfil) : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  const now = getCurrentSystemDateTime();
  const todayDbDate = getTodaySystemDate();

  const todayInput = formatDateInput(todayDbDate);
  const filtroDataRaw = firstParam(params.filtroData).trim();
  const filtroMesRaw = firstParam(params.filtroMes).trim();
  const filtroAnoRaw = firstParam(params.filtroAno).trim();
  const filtroArea = firstParam(params.filtroArea).trim();
  const filtroStatusRaw = firstParam(params.filtroStatus).trim();
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const openArea = firstParam(params.openArea).trim();
  const openData = parseDateInput(firstParam(params.openData).trim());

  const hasManualFilters =
    !isColaborador &&
    Boolean(
      filtroDataRaw ||
        filtroMesRaw ||
        filtroAnoRaw ||
        filtroArea ||
        filtroStatusRaw ||
        filtroResponsavel
    );

  const filtroData = hasManualFilters ? filtroDataRaw : todayInput;
  const filtroMes = parsePositiveInt(filtroMesRaw);
  const filtroAno = parsePositiveInt(filtroAnoRaw);
  const filtroStatus = parseDailyStatus(filtroStatusRaw);

  const where: Prisma.PlanoLimpezaDiarioRegistroWhereInput = {};
  const dataFiltro = parseDateInput(filtroData);
  const syncDate = dataFiltro ? formatDateInput(dataFiltro) : null;
  if (dataFiltro) {
    where.data = dataFiltro;
  } else if (filtroMes && filtroAno && filtroMes <= 12) {
    const range = getMonthDateRange(filtroMes, filtroAno);
    where.data = { gte: range.start, lte: range.end };
  } else if (filtroAno) {
    const range = getYearDateRange(filtroAno);
    where.data = { gte: range.start, lte: range.end };
  }

  if (filtroArea) {
    where.area = filtroArea;
  }
  if (filtroStatus) {
    where.status = filtroStatus;
  }
  if (filtroResponsavel) {
    where.assinaturaResponsavel = { contains: filtroResponsavel, mode: "insensitive" };
  }

  const [registros, areaConfigs, areasHistoricas] = await Promise.all([
    prisma.planoLimpezaDiarioRegistro.findMany({
      where,
      orderBy: [{ data: "desc" }, { area: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.planoLimpezaDiarioArea.findMany({
      include: {
        itens: {
          where: { excluidoEm: null },
          orderBy: [{ ordem: "asc" }, { descricao: "asc" }]
        }
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.planoLimpezaDiarioRegistro.findMany({
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" }
    })
  ]);

  const areaOptions = Array.from(
    new Set([...areaConfigs.map((item) => item.nome), ...areasHistoricas.map((item) => item.area)])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const detalhamentoPorArea = new Map(
    areaConfigs.map((item) => [item.nome, item.detalhamentoLimpeza])
  );

  const signId = parsePositiveInt(firstParam(params.signId));
  const registroParaAssinatura = signId
    ? await prisma.planoLimpezaDiarioRegistro.findUnique({ where: { id: signId } })
    : null;
  const etapaAssinatura = registroParaAssinatura ? getDailySignStage(registroParaAssinatura) : null;

  const fechamentoMesRaw = parsePositiveInt(firstParam(params.fechamentoMes));
  const fechamentoAnoRaw = parsePositiveInt(firstParam(params.fechamentoAno));
  const periodoAtual = getMonthYear(now);
  const fechamentoMes =
    fechamentoMesRaw && fechamentoMesRaw >= 1 && fechamentoMesRaw <= 12
      ? fechamentoMesRaw
      : periodoAtual.mes;
  const fechamentoAno = fechamentoAnoRaw ?? periodoAtual.ano;

  const periodos = new Map<string, { mes: number; ano: number }>();
  for (const registro of registros) {
    const periodo = getMonthYear(registro.data);
    periodos.set(periodKey(periodo.mes, periodo.ano), periodo);
  }
  if (registroParaAssinatura) {
    const periodo = getMonthYear(registroParaAssinatura.data);
    periodos.set(periodKey(periodo.mes, periodo.ano), periodo);
  }
  periodos.set(periodKey(fechamentoMes, fechamentoAno), {
    mes: fechamentoMes,
    ano: fechamentoAno
  });

  const periodosFechados = periodos.size
    ? await prisma.planoLimpezaFechamento.findMany({
        where: {
          tipo: TipoPlanoLimpeza.DIARIO,
          status: StatusFechamentoPlanoLimpeza.ASSINADO,
          OR: Array.from(periodos.values()).map((periodo) => ({
            mes: periodo.mes,
            ano: periodo.ano
          }))
        }
      })
    : [];
  const fechadosSet = new Set(periodosFechados.map((item) => periodKey(item.mes, item.ano)));

  const assinaturaBloqueadaPorFechamento = registroParaAssinatura
    ? fechadosSet.has(
        periodKey(
          getMonthYear(registroParaAssinatura.data).mes,
          getMonthYear(registroParaAssinatura.data).ano
        )
      )
    : false;
  const assinaturaBloqueadaPorExecutor =
    registroParaAssinatura && etapaAssinatura === "supervisor"
      ? (usuarioLogadoId !== null &&
          registroParaAssinatura.assinaturaResponsavelUsuarioId === usuarioLogadoId) ||
        (!registroParaAssinatura.assinaturaResponsavelUsuarioId &&
          registroParaAssinatura.assinaturaResponsavel.trim() === responsavelLogado.trim())
      : false;

  const paramsRetorno = new URLSearchParams();
  if (filtroData) paramsRetorno.set("filtroData", filtroData);
  if (filtroMes) paramsRetorno.set("filtroMes", String(filtroMes));
  if (filtroAno) paramsRetorno.set("filtroAno", String(filtroAno));
  if (filtroArea) paramsRetorno.set("filtroArea", filtroArea);
  if (filtroStatus) paramsRetorno.set("filtroStatus", filtroStatus);
  if (filtroResponsavel) paramsRetorno.set("filtroResponsavel", filtroResponsavel);
  paramsRetorno.set("fechamentoMes", String(fechamentoMes));
  paramsRetorno.set("fechamentoAno", String(fechamentoAno));

  type DailyRecord = (typeof registros)[number];
  type DailyAreaConfig = (typeof areaConfigs)[number];
  type DailyAreaItem = DailyAreaConfig["itens"][number];
  type DailyAreaSummary = {
    key: string;
    data: Date;
    area: string;
    signedItems: number;
    totalItems: number;
    status: DailyAreaStatus | "Sem itens cadastrados";
    records: DailyRecord[];
    items: DailyAreaItem[];
  };

  const isDailyRecordSigned = (record: DailyRecord): boolean =>
    record.assinaturaResponsavel.trim().length > 0 ||
    Boolean(record.assinaturaResponsavelDataHora);
  const summaryKey = (date: Date, area: string): string => `${formatDateInput(date)}|${area}`;
  const pickDailyRecord = (
    current: DailyRecord | undefined,
    candidate: DailyRecord
  ): DailyRecord => {
    if (!current) {
      return candidate;
    }

    const currentSigned = isDailyRecordSigned(current);
    const candidateSigned = isDailyRecordSigned(candidate);

    if (candidateSigned && !currentSigned) {
      return candidate;
    }

    if (
      candidateSigned === currentSigned &&
      candidate.updatedAt.getTime() > current.updatedAt.getTime()
    ) {
      return candidate;
    }

    return current;
  };

  const areaSummariesByKey = new Map<string, DailyAreaSummary>();
  const activeDailyAreas = areaConfigs.filter((area) => area.ativo);
  const areaConfigByName = new Map(areaConfigs.map((area) => [area.nome, area]));
  const recordsByDateAreaItem = new Map<string, DailyRecord>();

  for (const registro of registros) {
    if (!registro.itemId) {
      continue;
    }

    const key = `${formatDateInput(registro.data)}|${registro.area}|${registro.itemId}`;
    recordsByDateAreaItem.set(key, pickDailyRecord(recordsByDateAreaItem.get(key), registro));
  }

  if (dataFiltro) {
    for (const area of activeDailyAreas) {
      if (filtroArea && area.nome !== filtroArea) {
        continue;
      }

      const activeItems = area.itens.filter((item) => item.ativo && !item.excluidoEm);
      const recordsForArea: DailyRecord[] = [];
      let signedItems = 0;

      for (const item of activeItems) {
        const record = recordsByDateAreaItem.get(
          `${formatDateInput(dataFiltro)}|${area.nome}|${item.id}`
        );
        if (record) {
          recordsForArea.push(record);
        }
        if (record && isDailyRecordSigned(record)) {
          signedItems += 1;
        }
      }

      const status =
        activeItems.length === 0
          ? "Sem itens cadastrados"
          : getDailyAreaStatus(activeItems.length, signedItems);

      if (
        filtroStatus &&
        recordsForArea.length > 0 &&
        !recordsForArea.some((record) => record.status === filtroStatus)
      ) {
        continue;
      }

      const key = summaryKey(dataFiltro, area.nome);
      areaSummariesByKey.set(key, {
        key,
        data: dataFiltro,
        area: area.nome,
        signedItems,
        totalItems: activeItems.length,
        status,
        records: recordsForArea,
        items: activeItems
      });
    }

    for (const registro of registros) {
      if (areaConfigByName.get(registro.area)?.ativo) {
        continue;
      }

      const key = summaryKey(registro.data, registro.area);
      const current =
        areaSummariesByKey.get(key) ??
        ({
          key,
          data: registro.data,
          area: registro.area,
          signedItems: 0,
          totalItems: 0,
          status: "Pendente",
          records: [],
          items: []
        } satisfies DailyAreaSummary);

      current.records.push(registro);
      current.totalItems += 1;
      if (isDailyRecordSigned(registro)) {
        current.signedItems += 1;
      }
      current.status = getDailyAreaStatus(current.totalItems, current.signedItems);
      areaSummariesByKey.set(key, current);
    }
  } else {
    for (const registro of registros) {
      const key = summaryKey(registro.data, registro.area);
      const areaConfig = areaConfigByName.get(registro.area);
      const activeItems =
        areaConfig?.itens.filter((item) => item.ativo && !item.excluidoEm) ?? [];
      const current =
        areaSummariesByKey.get(key) ??
        ({
          key,
          data: registro.data,
          area: registro.area,
          signedItems: 0,
          totalItems: 0,
          status: "Pendente",
          records: [],
          items: activeItems
        } satisfies DailyAreaSummary);

      current.records.push(registro);
      current.totalItems =
        current.items.length > 0
          ? current.items.length
          : new Set(current.records.map((record) => record.itemId ?? `legacy-${record.id}`))
              .size;
      current.signedItems = current.records.filter(isDailyRecordSigned).length;
      current.status =
        current.totalItems === 0
          ? "Sem itens cadastrados"
          : getDailyAreaStatus(current.totalItems, Math.min(current.signedItems, current.totalItems));
      areaSummariesByKey.set(key, current);
    }
  }

  const areaSummaries = Array.from(areaSummariesByKey.values()).sort((a, b) => {
    const dateDiff = b.data.getTime() - a.data.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.area.localeCompare(b.area, "pt-BR");
  });
  const visibleDetailedRecords = dataFiltro
    ? areaSummaries.flatMap((summary) => summary.records)
    : registros;
  const openedSummary =
    openData && openArea
      ? areaSummaries.find(
          (summary) =>
            formatDateInput(summary.data) === formatDateInput(openData) &&
            summary.area === openArea
        ) ?? null
      : null;

  const returnTo = buildPathWithParams(paramsRetorno);
  const openSummaryReturnTo = openedSummary
    ? (() => {
        const query = new URLSearchParams(paramsRetorno);
        query.set("openData", formatDateInput(openedSummary.data));
        query.set("openArea", openedSummary.area);
        return buildPathWithParams(query);
      })()
    : returnTo;
  const signModalReturnTo = registroParaAssinatura
    ? (() => {
        const query = new URLSearchParams(paramsRetorno);
        if (openedSummary) {
          query.set("openData", formatDateInput(openedSummary.data));
          query.set("openArea", openedSummary.area);
        }
        query.set("signId", String(registroParaAssinatura.id));
        return buildPathWithParams(query);
      })()
    : returnTo;
  const signModalError =
    registroParaAssinatura && feedbackType === "error" ? feedback : "";

  const rangeFechamento = getMonthDateRange(fechamentoMes, fechamentoAno);
  const [registrosFechamento, fechamentoAtual] = await Promise.all([
    prisma.planoLimpezaDiarioRegistro.findMany({
      where: { data: { gte: rangeFechamento.start, lte: rangeFechamento.end } },
      orderBy: [{ data: "desc" }, { area: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.planoLimpezaFechamento.findUnique({
      where: {
        tipo_mes_ano: { tipo: TipoPlanoLimpeza.DIARIO, mes: fechamentoMes, ano: fechamentoAno }
      }
    })
  ]);

  const resumoFechamentoCompleto = consolidateDailyRecordsByDay(
    registrosFechamento,
    formatDateInput
  );
  const resumoFechamento = resumoFechamentoCompleto.slice(0, 10);
  const fechamentoAssinado = fechamentoAtual?.status === StatusFechamentoPlanoLimpeza.ASSINADO;
  const reaberturaFormId = `reabertura-form-diario-${fechamentoMes}-${fechamentoAno}`;
  const modalDailyRows = openedSummary
    ? openedSummary.items.length > 0
      ? openedSummary.items.map((item) => ({
          key: `item-${item.id}`,
          title: item.descricao,
          produtoUtilizado: item.produtoUtilizado,
          setorResponsavel: item.setorResponsavel,
          funcionarioResponsavel: item.funcionarioResponsavel,
          registro:
            openedSummary.records.find((record) => record.itemId === item.id) ?? null
        }))
      : openedSummary.records.map((registro) => ({
          key: `registro-${registro.id}`,
          title: getDailyItemDescription(registro),
          produtoUtilizado: registro.produtoUtilizado,
          setorResponsavel: registro.setorResponsavel,
          funcionarioResponsavel: registro.funcionarioResponsavel,
          registro
        }))
    : [];

  return (
    <div className="space-y-6 dark:text-slate-100">
      <DailyChecklistSync date={syncDate} enabled={areaConfigs.length > 0} />

      <DocumentosModuleHeader
        title="Plano de Limpeza Diário"
        description="Checklist diário automático por área e itens/locais assináveis."
        modulo={ModuloDocumento.PLANO_LIMPEZA_DIARIO}
        modulePath={PAGE_PATH}
        searchParams={params}
        managementHref={podeGerenciarOpcoes ? "/plano-limpeza/diario/opcoes" : undefined}
        maintenanceHref="/chamados-manutencao?origem=LIMPEZA"
        backHref="/plano-limpeza"
        actions={
          <>
            {podeVerGestao ? (
              <Link href="/plano-limpeza/diario/historico" className="btn-secondary">
                Histórico Completo
              </Link>
            ) : null}
          </>
        }
      />

      {feedback ? (
        <section
          className={`rounded-xl border p-4 text-sm ${
            feedbackType === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {feedback}
        </section>
      ) : null}

      {registroParaAssinatura && assinaturaBloqueadaPorFechamento ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Este checklist pertence a um mês fechado e não pode receber assinatura.
        </section>
      ) : null}

      {registroParaAssinatura && assinaturaBloqueadaPorExecutor ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Quem executou o serviço não pode assinar como supervisor. Solicite a assinatura de outro responsável autorizado.
        </section>
      ) : null}

      {areaConfigs.length === 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {podeGerenciarOpcoes ? (
            <>
              Nenhuma área do plano diário foi configurada ainda. Use{" "}
              <strong>Gerenciar Plano Diário</strong>{" "}
              para cadastrar áreas e itens/locais antes de operar o checklist.
            </>
          ) : (
            "Nenhuma área do plano diário foi configurada ainda. Solicite à gestão a configuração do plano."
          )}
        </section>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Registros Automáticos do Dia
        </h2>

        {isColaborador ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Exibindo apenas tarefas e pendências do dia.
          </p>
        ) : (
          <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-5 dark:bg-slate-800">
            <input type="hidden" name="fechamentoMes" value={String(fechamentoMes)} />
            <input type="hidden" name="fechamentoAno" value={String(fechamentoAno)} />

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
              <input
                type="number"
                name="filtroAno"
                min={2020}
                max={2100}
                defaultValue={filtroAno ?? ""}
                className={INPUT_CLASS}
              />
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
                {DAILY_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-3">
              Responsável pela Limpeza
              <input
                type="text"
                name="filtroResponsavel"
                defaultValue={filtroResponsavel}
                className={INPUT_CLASS}
              />
            </label>

            <div className="btn-group md:col-span-5">
              <button type="submit" className="btn-primary">
                Aplicar Filtros
              </button>
              <Link
                href={buildPathWithParams(
                  new URLSearchParams({
                    fechamentoMes: String(fechamentoMes),
                    fechamentoAno: String(fechamentoAno)
                  })
                )}
                className="btn-secondary"
              >
                Limpar
              </Link>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Itens assinados</th>
                <th className="px-3 py-2">Status da área</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areaSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhuma área diária encontrada.
                  </td>
                </tr>
              ) : (
                areaSummaries.map((summary) => {
                  const q = new URLSearchParams(paramsRetorno);
                  q.set("openData", formatDateInput(summary.data));
                  q.set("openArea", summary.area);

                  return (
                    <tr key={summary.key}>
                      <td className="px-3 py-2">{formatDateDisplay(summary.data)}</td>
                      <td className="px-3 py-2">{summary.area}</td>
                      <td className="px-3 py-2">
                        {summary.totalItems > 0
                          ? `${summary.signedItems} de ${summary.totalItems}`
                          : "Sem itens cadastrados"}
                      </td>
                      <td className="px-3 py-2">
                        {summary.status === "Sem itens cadastrados" ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sem itens cadastrados
                          </span>
                        ) : (
                          <StatusBadge status={summary.status} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={buildPathWithParams(q)} scroll={false} className="btn-action">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-base font-semibold text-slate-900 dark:text-slate-100">
          Registros detalhados
        </h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Item/local</th>
                <th className="px-3 py-2">Responsável pela Limpeza</th>
                <th className="px-3 py-2">Supervisor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleDetailedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                visibleDetailedRecords.map((registro) => {
                  const periodo = getMonthYear(registro.data);
                  const bloqueado = fechadosSet.has(periodKey(periodo.mes, periodo.ano));
                  const etapa = getDailySignStage(registro);
                  const supervisorMesmoExecutor =
                    etapa === "supervisor" &&
                    ((usuarioLogadoId !== null &&
                      registro.assinaturaResponsavelUsuarioId === usuarioLogadoId) ||
                      (!registro.assinaturaResponsavelUsuarioId &&
                        registro.assinaturaResponsavel.trim() === responsavelLogado.trim()));
                  const detalhamentoLimpeza = detalhamentoPorArea.get(registro.area);
                  const hrefAssinar = (() => {
                    const q = new URLSearchParams(paramsRetorno);
                    q.set("signId", String(registro.id));
                    return buildPathWithParams(q);
                  })();

                  return (
                    <tr key={registro.id}>
                      <td className="px-3 py-2">{formatDateDisplay(registro.data)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {registro.area}
                        </p>
                        {detalhamentoLimpeza ? (
                          <p className="mt-1 max-w-md whitespace-pre-line break-words text-xs text-slate-600 dark:text-slate-300">
                            <strong>O que deve ser limpo:</strong> {detalhamentoLimpeza}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{getDailyItemDescription(registro)}</td>
                      <td className="px-3 py-2">{registro.assinaturaResponsavel || "-"}</td>
                      <td className="px-3 py-2">{registro.assinaturaSupervisor || "-"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={registro.status} />
                      </td>
                      <td className="px-3 py-2">
                        {bloqueado ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Bloqueado</span>
                        ) : supervisorMesmoExecutor ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Outro supervisor
                          </span>
                        ) : etapa ? (
                          <Link href={hrefAssinar} scroll={false} className="btn-action">
                            Assinar
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sem Ação
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {podeVerGestao ? (
      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Fechamento Mensal</h2>

        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4 dark:bg-slate-800">
          <input type="hidden" name="filtroData" value={filtroData} />
          <input type="hidden" name="filtroMes" value={filtroMes ? String(filtroMes) : ""} />
          <input type="hidden" name="filtroAno" value={filtroAno ? String(filtroAno) : ""} />
          <input type="hidden" name="filtroArea" value={filtroArea} />
          <input type="hidden" name="filtroStatus" value={filtroStatus ?? ""} />
          <input type="hidden" name="filtroResponsavel" value={filtroResponsavel} />

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Mês
            <select name="fechamentoMes" defaultValue={String(fechamentoMes)} className={INPUT_CLASS}>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={String(month.value)}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Ano
            <input
              type="number"
              name="fechamentoAno"
              min={2020}
              max={2100}
              defaultValue={fechamentoAno}
              className={INPUT_CLASS}
            />
          </label>

          <div className="md:col-span-2 md:flex md:items-end">
            <button type="submit" className="btn-secondary">
              Carregar Período
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            Período: {String(fechamentoMes).padStart(2, "0")}/{fechamentoAno} -{" "}
            {fechamentoAssinado ? "Assinado" : "Aberto"}
          </p>
          {resumoFechamentoCompleto.length > 10 ? (
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Exibindo os últimos 10 dias com registros neste período.
            </p>
          ) : null}

          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Total de Áreas</th>
                  <th className="px-3 py-2">Concluídas</th>
                  <th className="px-3 py-2">Aguardando Supervisor</th>
                  <th className="px-3 py-2">Pendentes</th>
                  <th className="px-3 py-2">Situação Geral</th>
                  <th className="px-3 py-2">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resumoFechamento.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      Nenhum registro no período selecionado.
                    </td>
                  </tr>
                ) : (
                  resumoFechamento.map((dia) => (
                    <tr key={formatDateInput(dia.data)}>
                      <td className="px-3 py-2">{formatDateDisplay(dia.data)}</td>
                      <td className="px-3 py-2">{dia.totalAreas}</td>
                      <td className="px-3 py-2">{dia.concluido}</td>
                      <td className="px-3 py-2">{dia.aguardandoSupervisor}</td>
                      <td className="px-3 py-2">{dia.pendente}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getDailyConsolidatedStatusClass(
                            dia.situacaoGeral
                          )}`}
                        >
                          {dia.situacaoGeral}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200">
                            Ver Áreas
                          </summary>
                          <div className="mt-2 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                  <th className="px-2 py-1 text-left">Área</th>
                                  <th className="px-2 py-1 text-left">Responsável</th>
                                  <th className="px-2 py-1 text-left">Supervisor</th>
                                  <th className="px-2 py-1 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {dia.detalhes.map((detalhe) => {
                                  const detalhamentoLimpeza = detalhamentoPorArea.get(detalhe.area);

                                  return (
                                  <tr key={detalhe.id}>
                                    <td className="px-2 py-1">
                                      <p>{detalhe.area}</p>
                                      {detalhamentoLimpeza ? (
                                        <p className="mt-1 max-w-sm whitespace-pre-line break-words text-[11px] text-slate-500 dark:text-slate-400">
                                          {detalhamentoLimpeza}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="px-2 py-1">{detalhe.assinaturaResponsavel || "-"}</td>
                                    <td className="px-2 py-1">{detalhe.assinaturaSupervisor || "-"}</td>
                                    <td className="px-2 py-1">
                                      <StatusBadge status={detalhe.status} />
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {fechamentoAssinado ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <p>
                Mês assinado por <strong>{fechamentoAtual?.responsavelTecnico}</strong>.
              </p>
              <p>
                Data da assinatura:{" "}
                <strong>
                  {fechamentoAtual ? formatDateTimeDisplay(fechamentoAtual.dataAssinatura) : "-"}
                </strong>
              </p>
              {podeReabrir ? (
                <>
                  <form id={reaberturaFormId} action={reopenDailyMonthAction} className="mt-4">
                    <input type="hidden" name="mes" value={String(fechamentoMes)} />
                    <input type="hidden" name="ano" value={String(fechamentoAno)} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                  </form>
                  <ReopenMonthModal
                    mes={fechamentoMes}
                    ano={fechamentoAno}
                    formId={reaberturaFormId}
                  />
                </>
              ) : null}
            </div>
          ) : podeFechar ? (
            <form action={closeDailyMonthAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="mes" value={String(fechamentoMes)} />
              <input type="hidden" name="ano" value={String(fechamentoAno)} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Confirme sua Senha *
                <input type="password" name="senhaConfirmacao" required className={INPUT_CLASS} />
              </label>
              <SignatureContextCard
                nomeUsuario={responsavelLogado}
                perfil={perfilLogado}
                dataHora={formatDateTimeDisplay(now)}
              />
              <div className="md:col-span-2">
                <button type="submit" className="btn-primary">
                  Fechar Mês
                </button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Seu perfil não possui permissão para assinar o fechamento mensal.
            </p>
          )}
        </div>
      </section>
      ) : null}

      {openedSummary ? (
        <ActionModal
          title={openedSummary.area}
          cancelHref={returnTo}
          maxWidthClassName="max-w-5xl"
          description={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span>{formatDateDisplay(openedSummary.data)}</span>
              <span aria-hidden="true" className="hidden text-slate-400 sm:inline">
                •
              </span>
              <span>
                {openedSummary.totalItems > 0
                  ? `${openedSummary.signedItems} de ${openedSummary.totalItems} itens assinados`
                  : "Sem itens cadastrados"}
              </span>
              {openedSummary.status === "Sem itens cadastrados" ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Sem itens cadastrados
                </span>
              ) : (
                <StatusBadge status={openedSummary.status} />
              )}
            </div>
          }
        >
          {feedback ? (
            <p
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                feedbackType === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              }`}
            >
              {feedback}
            </p>
          ) : null}

          {detalhamentoPorArea.get(openedSummary.area) ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Orientação geral da área
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-slate-700 dark:text-slate-200">
                {detalhamentoPorArea.get(openedSummary.area)}
              </p>
            </div>
          ) : null}

          {modalDailyRows.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Esta área ainda não possui itens/locais cadastrados.
            </p>
          ) : (
            <div className="grid gap-3">
              {modalDailyRows.map((row) => {
                const registro = row.registro;
                const periodo = registro ? getMonthYear(registro.data) : null;
                const bloqueado = periodo ? fechadosSet.has(periodKey(periodo.mes, periodo.ano)) : false;
                const etapa = registro ? getDailySignStage(registro) : null;
                const supervisorMesmoExecutor =
                  registro !== null &&
                  etapa === "supervisor" &&
                  ((usuarioLogadoId !== null &&
                    registro.assinaturaResponsavelUsuarioId === usuarioLogadoId) ||
                    (!registro.assinaturaResponsavelUsuarioId &&
                      registro.assinaturaResponsavel.trim() === responsavelLogado.trim()));
                const hrefAssinar = registro
                  ? (() => {
                      const query = new URLSearchParams(paramsRetorno);
                      query.set("openData", formatDateInput(openedSummary.data));
                      query.set("openArea", openedSummary.area);
                      query.set("signId", String(registro.id));
                      return buildPathWithParams(query);
                    })()
                  : "";

                return (
                  <article
                    key={row.key}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-medium text-slate-900 dark:text-slate-100">
                          {row.title}
                        </p>
                        <div className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                          <p>Produto: <strong>{row.produtoUtilizado || "-"}</strong></p>
                          <p>Setor: <strong>{row.setorResponsavel || "-"}</strong></p>
                          <p>Funcionário: <strong>{row.funcionarioResponsavel || "-"}</strong></p>
                        </div>
                        <div className="mt-3 grid gap-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                          <p>
                            Responsável: <strong>{registro?.assinaturaResponsavel || "-"}</strong>
                          </p>
                          <p>
                            Quando:{" "}
                            <strong>
                              {registro?.assinaturaResponsavelDataHora
                                ? formatDateTimeDisplay(registro.assinaturaResponsavelDataHora)
                                : "Ainda não assinado"}
                            </strong>
                          </p>
                          <p>
                            Supervisor: <strong>{registro?.assinaturaSupervisor || "-"}</strong>
                          </p>
                          <p>
                            Visto em:{" "}
                            <strong>
                              {registro?.assinaturaSupervisorDataHora
                                ? formatDateTimeDisplay(registro.assinaturaSupervisorDataHora)
                                : "-"}
                            </strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <StatusBadge status={registro?.status ?? "Pendente"} />
                        {bloqueado ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Bloqueado</span>
                        ) : supervisorMesmoExecutor ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Outro supervisor
                          </span>
                        ) : registro && etapa ? (
                          <Link href={hrefAssinar} scroll={false} className="btn-action">
                            Assinar
                          </Link>
                        ) : !registro ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Registro em preparação
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sem Ação
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ActionModal>
      ) : null}

      {registroParaAssinatura &&
      etapaAssinatura &&
      !assinaturaBloqueadaPorFechamento &&
      !assinaturaBloqueadaPorExecutor ? (
        <DailySignChecklistModal
          closeHref={openSummaryReturnTo}
          returnTo={signModalReturnTo}
          successReturnTo={openSummaryReturnTo}
          record={registroParaAssinatura}
          detalhamentoLimpeza={detalhamentoPorArea.get(registroParaAssinatura.area) ?? null}
          etapa={etapaAssinatura}
          usuarioAssinando={responsavelLogado}
          dataHoraAtual={formatDateTimeDisplay(now)}
          errorMessage={signModalError}
        />
      ) : null}
    </div>
  );
}
