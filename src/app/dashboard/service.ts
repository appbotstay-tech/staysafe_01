import {
  StatusChamadoManutencao,
  StatusItemBuffetAmostra,
  StatusNotaRecebimento,
  StatusPlanoLimpeza,
  StatusQualidadeOleo,
  StatusTemperaturaEquipamento,
  TipoOpcaoTemperaturaEquipamento,
  TipoPlanoLimpeza,
  TurnoTemperaturaEquipamento,
  type TurnoPlanoLimpeza
} from "@prisma/client";

import {
  formatDateDisplay,
  formatDateInput,
  formatDateTimeDisplay,
  getCurrentSystemDateTime,
  getCurrentWeekDateRange,
  getMonthDateRange,
  getMonthYear,
  getTodaySystemDate,
  getTurnoLabel,
  getWeekStartDateForDate
} from "@/app/plano-limpeza/utils";
import type { AuthenticatedUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

import {
  DASHBOARD_PERIODS,
  type DashboardData,
  type DashboardDetailItem,
  type DashboardModuleSummary,
  type DashboardNormalizedStatus,
  type DashboardPeriod,
  type DashboardProfileView,
  type DashboardSummaryCard
} from "./types";

const DETAIL_LIMIT = 18;

const MODULES = {
  hortifruti: {
    id: "hortifruti",
    name: "Higienização de Hortifruti",
    href: "/higienizacao-hortifruti"
  },
  temperatura: {
    id: "temperatura",
    name: "Controle de Temperatura",
    href: "/controle-temperatura-equipamentos"
  },
  oleo: {
    id: "oleo",
    name: "Controle de Qualidade do Óleo",
    href: "/controle-qualidade-oleo"
  },
  rastreabilidade: {
    id: "rastreabilidade",
    name: "Rastreabilidade",
    href: "/rastreabilidade-recebimento"
  },
  buffet: {
    id: "buffet",
    name: "Controle de Buffet / Amostras",
    href: "/controle-buffet-amostras"
  },
  limpezaDiaria: {
    id: "limpeza-diaria",
    name: "Plano de Limpeza Diário",
    href: "/plano-limpeza/diario"
  },
  limpezaSemanal: {
    id: "limpeza-semanal",
    name: "Plano de Limpeza Semanal",
    href: "/plano-limpeza/semanal"
  },
  chamados: {
    id: "chamados",
    name: "Chamados de Manutenção",
    href: "/chamados-manutencao"
  }
} as const;

type DateOnlyRange = {
  start: Date;
  end: Date;
};

type DashboardRanges = {
  periodLabel: string;
  daily: DateOnlyRange;
  weekly: DateOnlyRange;
  monthly: DateOnlyRange;
  dateTime: {
    start: Date;
    end: Date;
  };
  mes: number;
  ano: number;
};

type ModuleStats = {
  id: string;
  name: string;
  href: string;
  total: number;
  completed: number;
  pending: number;
  inProgress?: number;
  waitingResponsible?: number;
  waitingSupervisor?: number;
  note?: string;
  pendingDetails: DashboardDetailItem[];
  completedDetails: DashboardDetailItem[];
};

export function parseDashboardPeriod(value: string): DashboardPeriod {
  return DASHBOARD_PERIODS.includes(value as DashboardPeriod)
    ? (value as DashboardPeriod)
    : "hoje";
}

function calculatePercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function buildSummaryCard(params: Omit<DashboardSummaryCard, "percentCompleted" | "percentPending">): DashboardSummaryCard {
  return {
    ...params,
    percentCompleted: calculatePercent(params.completed, params.total),
    percentPending: calculatePercent(params.pending, params.total)
  };
}

function buildModuleSummary(stats: ModuleStats): DashboardModuleSummary {
  const status: DashboardModuleSummary["status"] =
    stats.total === 0
      ? "Sem dados"
      : stats.pending === 0
        ? "Concluído"
        : stats.completed === 0
          ? "Pendente"
          : "Parcial";

  return {
    id: stats.id,
    name: stats.name,
    href: stats.href,
    total: stats.total,
    completed: stats.completed,
    pending: stats.pending,
    status,
    note: stats.note
  };
}

function addDetail(list: DashboardDetailItem[], item: DashboardDetailItem): void {
  if (list.length < DETAIL_LIMIT) {
    list.push(item);
  }
}

function combineDetails(
  stats: ModuleStats[],
  field: "pendingDetails" | "completedDetails"
): DashboardDetailItem[] {
  const details: DashboardDetailItem[] = [];

  for (const stat of stats) {
    for (const item of stat[field]) {
      addDetail(details, item);
    }
  }

  return details;
}

function combineStatsToCard(params: {
  id: string;
  title: string;
  description: string;
  href?: string;
  stats: ModuleStats[];
}): DashboardSummaryCard {
  const total = params.stats.reduce((sum, item) => sum + item.total, 0);
  const completed = params.stats.reduce((sum, item) => sum + item.completed, 0);
  const pending = params.stats.reduce((sum, item) => sum + item.pending, 0);
  const inProgress = params.stats.reduce((sum, item) => sum + (item.inProgress ?? 0), 0);
  const waitingResponsible = params.stats.reduce(
    (sum, item) => sum + (item.waitingResponsible ?? 0),
    0
  );
  const waitingSupervisor = params.stats.reduce(
    (sum, item) => sum + (item.waitingSupervisor ?? 0),
    0
  );

  return buildSummaryCard({
    id: params.id,
    title: params.title,
    description: params.description,
    href: params.href,
    total,
    completed,
    pending,
    inProgress,
    waitingResponsible,
    waitingSupervisor,
    pendingDetails: combineDetails(params.stats, "pendingDetails"),
    completedDetails: combineDetails(params.stats, "completedDetails")
  });
}

function formatRangeLabel(range: DateOnlyRange): string {
  if (formatDateInput(range.start) === formatDateInput(range.end)) {
    return formatDateDisplay(range.start);
  }

  return `${formatDateDisplay(range.start)} a ${formatDateDisplay(range.end)}`;
}

function dateOnlyKey(date: Date): string {
  return formatDateInput(date);
}

function minDateOnly(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function enumerateDateRange(range: DateOnlyRange): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(range.start);

  while (cursor.getTime() <= range.end.getTime()) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function dateOnlyToLocalDateTime(date: Date, endOfDay: boolean): Date {
  const [year, month, day] = formatDateInput(date).split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}

function getRanges(period: DashboardPeriod, now: Date): DashboardRanges {
  const today = getTodaySystemDate();
  const { mes, ano } = getMonthYear(today);
  const currentWeek = getCurrentWeekDateRange(now);
  const currentMonth = getMonthDateRange(mes, ano);

  const daily =
    period === "semana"
      ? { start: currentWeek.start, end: minDateOnly(currentWeek.end, today) }
      : period === "mes"
        ? { start: currentMonth.start, end: minDateOnly(currentMonth.end, today) }
        : { start: today, end: today };

  const weekly =
    period === "mes"
      ? { start: currentMonth.start, end: minDateOnly(currentMonth.end, today) }
      : { start: currentWeek.start, end: minDateOnly(currentWeek.end, today) };

  const dateTimeStart = dateOnlyToLocalDateTime(daily.start, false);
  const dateTimeEnd = dateOnlyToLocalDateTime(daily.end, true);

  return {
    periodLabel:
      period === "semana" ? "Semana Atual" : period === "mes" ? "Mês Atual" : "Hoje",
    daily,
    weekly,
    monthly: currentMonth,
    dateTime: {
      start: dateTimeStart,
      end: dateTimeEnd.getTime() > now.getTime() ? now : dateTimeEnd
    },
    mes,
    ano
  };
}

function getProfileView(user: AuthenticatedUser): DashboardProfileView {
  if (user.perfil === "FUNCIONARIO") {
    return {
      role: user.perfil,
      title: "Minhas Rotinas",
      subtitle: "Pendências operacionais liberadas para o seu perfil.",
      showManagement: false
    };
  }

  if (user.perfil === "SUPERVISOR") {
    return {
      role: user.perfil,
      title: "Dashboard Operacional",
      subtitle: "Pendências, assinaturas e chamados que precisam de supervisão.",
      showManagement: true
    };
  }

  if (user.perfil === "RESPONSAVEL_TECNICO") {
    return {
      role: user.perfil,
      title: "Dashboard Sanitário",
      subtitle: "Validações técnicas, fechamentos e módulos sanitários em acompanhamento.",
      showManagement: true
    };
  }

  if (user.perfil === "GESTOR") {
    return {
      role: user.perfil,
      title: "Dashboard Gerencial",
      subtitle: "Visão consolidada da operação, pendências por módulo e chamados.",
      showManagement: true
    };
  }

  return {
    role: user.perfil,
    title: "Dashboard DEV",
    subtitle: "Visão completa dos indicadores operacionais disponíveis na Fase 1.",
    showManagement: true
  };
}

function temperatureShiftLabel(turno: TurnoTemperaturaEquipamento): string {
  return turno === TurnoTemperaturaEquipamento.MANHA ? "Manhã" : "Tarde";
}

function temperatureStatusLabel(status: StatusTemperaturaEquipamento): DashboardNormalizedStatus {
  return status === StatusTemperaturaEquipamento.CONFORME ? "Concluído" : "Não conformidade";
}

function oilStatusLabel(status: StatusQualidadeOleo): DashboardNormalizedStatus {
  if (
    status === StatusQualidadeOleo.DESCARTAR ||
    status === StatusQualidadeOleo.ULTIMA_UTILIZACAO
  ) {
    return "Não conformidade";
  }

  return "Concluído";
}

function noteStatusLabel(status: StatusNotaRecebimento): DashboardNormalizedStatus {
  if (status === StatusNotaRecebimento.FINALIZADA) {
    return "Concluído";
  }

  if (status === StatusNotaRecebimento.EM_CONFERENCIA) {
    return "Em andamento";
  }

  return "Aguardando responsável";
}

function cleaningStatusLabel(status: StatusPlanoLimpeza): DashboardNormalizedStatus {
  if (status === StatusPlanoLimpeza.CONCLUIDO) {
    return "Concluído";
  }

  if (status === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR) {
    return "Aguardando supervisor";
  }

  return "Aguardando responsável";
}

function buffetStatusLabel(status: StatusItemBuffetAmostra): DashboardNormalizedStatus {
  if (status === StatusItemBuffetAmostra.ASSINADO) {
    return "Concluído";
  }

  if (status === StatusItemBuffetAmostra.PREENCHIDO) {
    return "Aguardando responsável";
  }

  return "Pendente";
}

function maintenanceStatusLabel(status: StatusChamadoManutencao): DashboardNormalizedStatus {
  if (status === StatusChamadoManutencao.CONCLUIDO) {
    return "Concluído";
  }

  if (status === StatusChamadoManutencao.EM_ANDAMENTO) {
    return "Em andamento";
  }

  if (status === StatusChamadoManutencao.CANCELADO) {
    return "Cancelado";
  }

  return "Pendente";
}

function moduleStatsBase(moduleInfo: (typeof MODULES)[keyof typeof MODULES]): ModuleStats {
  return {
    id: moduleInfo.id,
    name: moduleInfo.name,
    href: moduleInfo.href,
    total: 0,
    completed: 0,
    pending: 0,
    pendingDetails: [],
    completedDetails: []
  };
}

function addPending(stats: ModuleStats, detail: DashboardDetailItem, status?: DashboardNormalizedStatus): void {
  stats.total += 1;
  stats.pending += 1;

  if (status === "Aguardando supervisor") {
    stats.waitingSupervisor = (stats.waitingSupervisor ?? 0) + 1;
  } else if (status === "Aguardando responsável") {
    stats.waitingResponsible = (stats.waitingResponsible ?? 0) + 1;
  } else if (status === "Em andamento") {
    stats.inProgress = (stats.inProgress ?? 0) + 1;
  }

  addDetail(stats.pendingDetails, detail);
}

function addCompleted(stats: ModuleStats, detail: DashboardDetailItem): void {
  stats.total += 1;
  stats.completed += 1;
  addDetail(stats.completedDetails, detail);
}

async function buildDailyCleaningStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.limpezaDiaria;
  const stats = moduleStatsBase(moduleInfo);
  const dates = enumerateDateRange(range);

  const [areaConfigs, registros] = await Promise.all([
    prisma.planoLimpezaDiarioArea.findMany({
      where: { ativo: true },
      select: {
        nome: true,
        turnoManha: true,
        turnoTarde: true,
        turnoNoite: true
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.planoLimpezaDiarioRegistro.findMany({
      where: { data: { gte: range.start, lte: range.end } },
      select: {
        id: true,
        data: true,
        area: true,
        turno: true,
        assinaturaResponsavel: true,
        assinaturaSupervisor: true,
        status: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  const turnosByArea = areaConfigs.map((area) => {
    const turnos: TurnoPlanoLimpeza[] = [];
    if (area.turnoManha) turnos.push("MANHA");
    if (area.turnoTarde) turnos.push("TARDE");
    if (area.turnoNoite) turnos.push("NOITE");

    return {
      area: area.nome,
      turnos
    };
  });

  const keyFor = (date: Date, area: string, turno: TurnoPlanoLimpeza) =>
    `${dateOnlyKey(date)}|${area}|${turno}`;
  const recordsByKey = new Map<string, (typeof registros)[number]>();

  for (const record of registros) {
    const key = keyFor(record.data, record.area, record.turno);
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, record);
    }
  }

  const expectedKeys = new Set<string>();

  for (const date of dates) {
    for (const area of turnosByArea) {
      for (const turno of area.turnos) {
        const key = keyFor(date, area.area, turno);
        expectedKeys.add(key);
        const record = recordsByKey.get(key);
        const href = `${moduleInfo.href}?filtroData=${formatDateInput(date)}&filtroArea=${encodeURIComponent(area.area)}&filtroTurno=${turno}`;

        if (!record) {
          addPending(
            stats,
            {
              id: `${moduleInfo.id}:${key}:missing`,
              moduleId: moduleInfo.id,
              moduleName: moduleInfo.name,
              title: `${area.area} | ${getTurnoLabel(turno)}`,
              description: `Sem registro em ${formatDateDisplay(date)}.`,
              status: "Aguardando responsável",
              dateTime: formatDateDisplay(date),
              href
            },
            "Aguardando responsável"
          );
          continue;
        }

        const status = cleaningStatusLabel(record.status);
        const detail = {
          id: `${moduleInfo.id}:${record.id}`,
          moduleId: moduleInfo.id,
          moduleName: moduleInfo.name,
          title: `${record.area} | ${getTurnoLabel(record.turno)}`,
          description:
            record.status === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR
              ? "Aguardando assinatura do supervisor."
              : "Checklist diário registrado.",
          status,
          responsible: record.assinaturaSupervisor || record.assinaturaResponsavel || undefined,
          dateTime: formatDateDisplay(record.data),
          href
        };

        if (record.status === StatusPlanoLimpeza.CONCLUIDO) {
          addCompleted(stats, detail);
        } else {
          addPending(stats, detail, status);
        }
      }
    }
  }

  for (const record of registros) {
    const key = keyFor(record.data, record.area, record.turno);
    if (expectedKeys.has(key)) {
      continue;
    }

    const status = cleaningStatusLabel(record.status);
    const detail = {
      id: `${moduleInfo.id}:${record.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: `${record.area} | ${getTurnoLabel(record.turno)}`,
      description: "Registro existente fora da configuração ativa atual.",
      status,
      responsible: record.assinaturaSupervisor || record.assinaturaResponsavel || undefined,
      dateTime: formatDateDisplay(record.data),
      href: `${moduleInfo.href}?filtroData=${formatDateInput(record.data)}`
    };

    if (record.status === StatusPlanoLimpeza.CONCLUIDO) {
      addCompleted(stats, detail);
    } else {
      addPending(stats, detail, status);
    }
  }

  return stats;
}

async function buildTemperatureStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.temperatura;
  const stats = moduleStatsBase(moduleInfo);
  const dates = enumerateDateRange(range);
  const shifts = [TurnoTemperaturaEquipamento.MANHA, TurnoTemperaturaEquipamento.TARDE];

  const [equipamentos, registros] = await Promise.all([
    prisma.controleTemperaturaEquipamentoOpcao.findMany({
      where: {
        tipo: TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO,
        ativo: true
      },
      select: { nome: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.controleTemperaturaEquipamento.findMany({
      where: { data: { gte: range.start, lte: range.end } },
      select: {
        id: true,
        data: true,
        equipamento: true,
        turno: true,
        status: true,
        responsavel: true,
        createdAt: true
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  const keyFor = (date: Date, equipamento: string, turno: TurnoTemperaturaEquipamento) =>
    `${dateOnlyKey(date)}|${equipamento}|${turno}`;
  const recordsByKey = new Map<string, (typeof registros)[number]>();

  for (const record of registros) {
    const key = keyFor(record.data, record.equipamento, record.turno);
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, record);
    }
  }

  const expectedKeys = new Set<string>();

  for (const date of dates) {
    for (const equipamento of equipamentos) {
      for (const turno of shifts) {
        const key = keyFor(date, equipamento.nome, turno);
        expectedKeys.add(key);
        const href = `${moduleInfo.href}?filtroData=${formatDateInput(date)}&filtroEquipamento=${encodeURIComponent(equipamento.nome)}`;
        const record = recordsByKey.get(key);

        if (!record) {
          addPending(
            stats,
            {
              id: `${moduleInfo.id}:${key}:missing`,
              moduleId: moduleInfo.id,
              moduleName: moduleInfo.name,
              title: `${equipamento.nome} | ${temperatureShiftLabel(turno)}`,
              description: `Aguardando aferição em ${formatDateDisplay(date)}.`,
              status: "Aguardando responsável",
              dateTime: formatDateDisplay(date),
              href
            },
            "Aguardando responsável"
          );
          continue;
        }

        addCompleted(stats, {
          id: `${moduleInfo.id}:${record.id}`,
          moduleId: moduleInfo.id,
          moduleName: moduleInfo.name,
          title: `${record.equipamento} | ${temperatureShiftLabel(record.turno)}`,
          description:
            record.status === StatusTemperaturaEquipamento.CONFORME
              ? "Temperatura registrada dentro da faixa."
              : "Temperatura registrada com ação corretiva.",
          status: temperatureStatusLabel(record.status),
          responsible: record.responsavel,
          dateTime: formatDateTimeDisplay(record.createdAt),
          href
        });
      }
    }
  }

  for (const record of registros) {
    const key = keyFor(record.data, record.equipamento, record.turno);
    if (expectedKeys.has(key)) {
      continue;
    }

    addCompleted(stats, {
      id: `${moduleInfo.id}:${record.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: `${record.equipamento} | ${temperatureShiftLabel(record.turno)}`,
      description: "Registro existente fora do catálogo ativo atual.",
      status: temperatureStatusLabel(record.status),
      responsible: record.responsavel,
      dateTime: formatDateTimeDisplay(record.createdAt),
      href: `${moduleInfo.href}?filtroData=${formatDateInput(record.data)}`
    });
  }

  return stats;
}

async function buildOilStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.oleo;
  const stats = moduleStatsBase(moduleInfo);
  const dates = enumerateDateRange(range);

  const [activeOptions, registros] = await Promise.all([
    prisma.controleQualidadeOleoOpcaoFita.count({ where: { ativo: true } }),
    prisma.controleQualidadeOleoRegistro.findMany({
      where: { data: { gte: range.start, lte: range.end } },
      select: {
        id: true,
        data: true,
        status: true,
        temperaturaCritica: true,
        semUtilizacao: true,
        responsavel: true,
        createdAt: true
      },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  const recordsByDate = new Map<string, (typeof registros)[number][]>();
  for (const record of registros) {
    const key = dateOnlyKey(record.data);
    recordsByDate.set(key, [...(recordsByDate.get(key) ?? []), record]);
  }

  if (activeOptions > 0) {
    for (const date of dates) {
      const key = dateOnlyKey(date);
      const records = recordsByDate.get(key) ?? [];
      const href = `${moduleInfo.href}?filtroData=${formatDateInput(date)}`;

      if (records.length === 0) {
        addPending(
          stats,
          {
            id: `${moduleInfo.id}:${key}:missing`,
            moduleId: moduleInfo.id,
            moduleName: moduleInfo.name,
            title: "Registro diário do óleo",
            description: `Aguardando registro em ${formatDateDisplay(date)}.`,
            status: "Aguardando responsável",
            dateTime: formatDateDisplay(date),
            href
          },
          "Aguardando responsável"
        );
        continue;
      }

      const latest = records[0];
      addCompleted(stats, {
        id: `${moduleInfo.id}:${latest.id}`,
        moduleId: moduleInfo.id,
        moduleName: moduleInfo.name,
        title: records.length > 1 ? `Registro do óleo (${records.length} registros)` : "Registro do óleo",
        description: latest.semUtilizacao
          ? "Registrado como sem utilização no período."
          : latest.temperaturaCritica
            ? "Registro com temperatura acima do limite."
            : "Registro diário realizado.",
        status: oilStatusLabel(latest.status),
        responsible: latest.responsavel,
        dateTime: formatDateTimeDisplay(latest.createdAt),
        href
      });
    }
  } else {
    for (const record of registros) {
      addCompleted(stats, {
        id: `${moduleInfo.id}:${record.id}`,
        moduleId: moduleInfo.id,
        moduleName: moduleInfo.name,
        title: "Registro do óleo",
        description: "Registro existente no período.",
        status: oilStatusLabel(record.status),
        responsible: record.responsavel,
        dateTime: formatDateTimeDisplay(record.createdAt),
        href: `${moduleInfo.href}?filtroData=${formatDateInput(record.data)}`
      });
    }
  }

  if (activeOptions === 0) {
    stats.note = "Sem opções ativas de fita cadastradas.";
  }

  return stats;
}

async function buildHortifrutiStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.hortifruti;
  const stats = moduleStatsBase(moduleInfo);

  const registros = await prisma.higienizacaoHortifruti.findMany({
    where: { data: { gte: range.start, lte: range.end } },
    select: {
      id: true,
      data: true,
      hortifruti: true,
      produtoUtilizado: true,
      responsavel: true,
      terminoProcesso: true,
      createdAt: true
    },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }]
  });

  for (const record of registros) {
    addCompleted(stats, {
      id: `${moduleInfo.id}:${record.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: record.hortifruti,
      description: `Produto: ${record.produtoUtilizado}.`,
      status: "Concluído",
      responsible: record.responsavel,
      dateTime: `${formatDateDisplay(record.data)} ${record.terminoProcesso}`,
      href: `${moduleInfo.href}?filtroData=${formatDateInput(record.data)}&filtroHortifruti=${encodeURIComponent(record.hortifruti)}`
    });
  }

  stats.note = "Sem agenda obrigatória configurada; considera somente registros lançados.";

  return stats;
}

async function buildReceivingStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.rastreabilidade;
  const stats = moduleStatsBase(moduleInfo);

  const notas = await prisma.rastreabilidadeRecebimentoNota.findMany({
    where: { data: { gte: range.start, lte: range.end } },
    select: {
      id: true,
      data: true,
      fornecedor: true,
      notaFiscal: true,
      statusNota: true,
      responsavelGeral: true,
      updatedAt: true,
      _count: {
        select: { itens: true }
      }
    },
    orderBy: [{ data: "desc" }, { updatedAt: "desc" }]
  });

  for (const nota of notas) {
    const status = noteStatusLabel(nota.statusNota);
    const detail = {
      id: `${moduleInfo.id}:${nota.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: `NF ${nota.notaFiscal} | ${nota.fornecedor}`,
      description: `${nota._count.itens} item(ns) vinculados.`,
      status,
      responsible: nota.responsavelGeral ?? undefined,
      dateTime: formatDateDisplay(nota.data),
      href: `${moduleInfo.href}/nota/${nota.id}`
    };

    if (nota.statusNota === StatusNotaRecebimento.FINALIZADA) {
      addCompleted(stats, detail);
    } else {
      addPending(stats, detail, status);
    }
  }

  return stats;
}

async function buildBuffetStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.buffet;
  const stats = moduleStatsBase(moduleInfo);
  const dates = enumerateDateRange(range);

  const [servicos, registros] = await Promise.all([
    prisma.controleBuffetAmostraServico.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        itens: {
          where: { item: { ativo: true } },
          select: {
            item: {
              select: { id: true, nome: true }
            }
          },
          orderBy: [{ item: { ordem: "asc" } }, { item: { nome: "asc" } }]
        }
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.controleBuffetAmostraRegistro.findMany({
      where: { data: { gte: range.start, lte: range.end } },
      select: {
        id: true,
        data: true,
        servicoId: true,
        itemId: true,
        itemExtra: true,
        itemNome: true,
        status: true,
        statusTemperatura: true,
        responsavelNome: true,
        assinaturaNome: true,
        assinaturaDataHora: true,
        dataHoraRegistro: true,
        servico: { select: { nome: true } }
      },
      orderBy: [{ data: "desc" }, { dataHoraRegistro: "desc" }]
    })
  ]);

  const keyFor = (date: Date, servicoId: number, itemId: number | null) =>
    `${dateOnlyKey(date)}|${servicoId}|${itemId ?? "extra"}`;
  const recordsByKey = new Map<string, (typeof registros)[number]>();

  for (const record of registros) {
    if (record.itemExtra || record.itemId === null) {
      continue;
    }

    const key = keyFor(record.data, record.servicoId, record.itemId);
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, record);
    }
  }

  const expectedKeys = new Set<string>();

  for (const date of dates) {
    for (const servico of servicos) {
      for (const vinculo of servico.itens) {
        const item = vinculo.item;
        const key = keyFor(date, servico.id, item.id);
        expectedKeys.add(key);
        const record = recordsByKey.get(key);
        const href = `${moduleInfo.href}/servico/${servico.id}?data=${formatDateInput(date)}`;

        if (!record) {
          addPending(stats, {
            id: `${moduleInfo.id}:${key}:missing`,
            moduleId: moduleInfo.id,
            moduleName: moduleInfo.name,
            title: `${servico.nome} | ${item.nome}`,
            description: `Aguardando preenchimento em ${formatDateDisplay(date)}.`,
            status: "Pendente",
            dateTime: formatDateDisplay(date),
            href
          });
          continue;
        }

        const status = buffetStatusLabel(record.status);
        const detail = {
          id: `${moduleInfo.id}:${record.id}`,
          moduleId: moduleInfo.id,
          moduleName: moduleInfo.name,
          title: `${servico.nome} | ${item.nome}`,
          description:
            record.statusTemperatura === "ALERTA" || record.statusTemperatura === "CRITICO"
              ? "Temperatura registrada com ação corretiva."
              : "Item do serviço registrado.",
          status:
            record.status === StatusItemBuffetAmostra.ASSINADO &&
            (record.statusTemperatura === "ALERTA" || record.statusTemperatura === "CRITICO")
              ? "Não conformidade"
              : status,
          responsible: record.assinaturaNome ?? record.responsavelNome,
          dateTime: formatDateTimeDisplay(record.assinaturaDataHora ?? record.dataHoraRegistro),
          href
        };

        if (record.status === StatusItemBuffetAmostra.ASSINADO) {
          addCompleted(stats, detail);
        } else {
          addPending(stats, detail, status);
        }
      }
    }
  }

  for (const record of registros) {
    const key = keyFor(record.data, record.servicoId, record.itemId);
    if (!record.itemExtra && expectedKeys.has(key)) {
      continue;
    }

    const status = buffetStatusLabel(record.status);
    const detail = {
      id: `${moduleInfo.id}:${record.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: `${record.servico.nome} | ${record.itemNome}`,
      description: record.itemExtra ? "Item extra lançado no serviço." : "Registro fora da configuração ativa atual.",
      status,
      responsible: record.assinaturaNome ?? record.responsavelNome,
      dateTime: formatDateTimeDisplay(record.assinaturaDataHora ?? record.dataHoraRegistro),
      href: `${moduleInfo.href}/servico/${record.servicoId}?data=${formatDateInput(record.data)}`
    };

    if (record.status === StatusItemBuffetAmostra.ASSINADO) {
      addCompleted(stats, detail);
    } else {
      addPending(stats, detail, status);
    }
  }

  return stats;
}

function enumerateWeekStarts(range: DateOnlyRange): Date[] {
  const starts = new Map<string, Date>();

  for (const date of enumerateDateRange(range)) {
    const weekStart = getWeekStartDateForDate(date);
    starts.set(dateOnlyKey(weekStart), weekStart);
  }

  return Array.from(starts.values()).sort((a, b) => a.getTime() - b.getTime());
}

async function buildWeeklyCleaningStats(range: DateOnlyRange): Promise<ModuleStats> {
  const moduleInfo = MODULES.limpezaSemanal;
  const stats = moduleStatsBase(moduleInfo);
  const weekStarts = enumerateWeekStarts(range);

  const [items, execucoes] = await Promise.all([
    prisma.planoLimpezaSemanalItem.findMany({
      where: { ativo: true },
      select: {
        id: true,
        area: true,
        oQueLimpar: true,
        quando: true
      },
      orderBy: [{ area: "asc" }, { ordem: "asc" }, { oQueLimpar: "asc" }]
    }),
    prisma.planoLimpezaSemanalExecucao.findMany({
      where: { dataExecucao: { gte: range.start, lte: range.end } },
      select: {
        id: true,
        dataExecucao: true,
        area: true,
        itemId: true,
        assinaturaResponsavel: true,
        assinaturaSupervisor: true,
        status: true,
        item: {
          select: {
            oQueLimpar: true,
            quando: true
          }
        },
        updatedAt: true
      },
      orderBy: [{ updatedAt: "desc" }]
    })
  ]);

  const keyFor = (weekStart: Date, itemId: number) => `${dateOnlyKey(weekStart)}|${itemId}`;
  const recordsByKey = new Map<string, (typeof execucoes)[number]>();

  for (const execution of execucoes) {
    const key = keyFor(getWeekStartDateForDate(execution.dataExecucao), execution.itemId);
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, execution);
    }
  }

  const expectedKeys = new Set<string>();

  for (const weekStart of weekStarts) {
    for (const item of items) {
      const key = keyFor(weekStart, item.id);
      expectedKeys.add(key);
      const execution = recordsByKey.get(key);
      const href = `${moduleInfo.href}?filtroData=${formatDateInput(weekStart)}&filtroArea=${encodeURIComponent(item.area)}`;

      if (!execution) {
        addPending(
          stats,
          {
            id: `${moduleInfo.id}:${key}:missing`,
            moduleId: moduleInfo.id,
            moduleName: moduleInfo.name,
            title: `${item.area} | ${item.oQueLimpar}`,
            description: `Semana de ${formatDateDisplay(weekStart)}. Frequência: ${item.quando}.`,
            status: "Aguardando responsável",
            dateTime: formatDateDisplay(weekStart),
            href
          },
          "Aguardando responsável"
        );
        continue;
      }

      const status = cleaningStatusLabel(execution.status);
      const detail = {
        id: `${moduleInfo.id}:${execution.id}`,
        moduleId: moduleInfo.id,
        moduleName: moduleInfo.name,
        title: `${execution.area} | ${execution.item.oQueLimpar}`,
        description: `Semana de ${formatDateDisplay(getWeekStartDateForDate(execution.dataExecucao))}. Frequência: ${execution.item.quando}.`,
        status,
        responsible: execution.assinaturaSupervisor || execution.assinaturaResponsavel || undefined,
        dateTime: formatDateDisplay(execution.dataExecucao),
        href
      };

      if (execution.status === StatusPlanoLimpeza.CONCLUIDO) {
        addCompleted(stats, detail);
      } else {
        addPending(stats, detail, status);
      }
    }
  }

  for (const execution of execucoes) {
    const key = keyFor(getWeekStartDateForDate(execution.dataExecucao), execution.itemId);
    if (expectedKeys.has(key)) {
      continue;
    }

    const status = cleaningStatusLabel(execution.status);
    const detail = {
      id: `${moduleInfo.id}:${execution.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: `${execution.area} | ${execution.item.oQueLimpar}`,
      description: "Execução existente fora da configuração ativa atual.",
      status,
      responsible: execution.assinaturaSupervisor || execution.assinaturaResponsavel || undefined,
      dateTime: formatDateDisplay(execution.dataExecucao),
      href: `${moduleInfo.href}?filtroData=${formatDateInput(execution.dataExecucao)}`
    };

    if (execution.status === StatusPlanoLimpeza.CONCLUIDO) {
      addCompleted(stats, detail);
    } else {
      addPending(stats, detail, status);
    }
  }

  return stats;
}

async function buildMonthlyClosingCard(params: {
  mes: number;
  ano: number;
  range: DateOnlyRange;
}): Promise<DashboardSummaryCard> {
  const [
    fechamentoHortifruti,
    fechamentoTemperatura,
    fechamentoOleo,
    fechamentoRastreabilidade,
    fechamentoLimpezaDiaria,
    fechamentoLimpezaSemanal,
    fechamentoBuffet,
    countHortifruti,
    countTemperatura,
    countOleo,
    countRastreabilidade,
    countLimpezaDiaria,
    countLimpezaSemanal,
    countBuffet
  ] = await Promise.all([
    prisma.higienizacaoHortifrutiFechamento.findUnique({
      where: { mes_ano: { mes: params.mes, ano: params.ano } }
    }),
    prisma.controleTemperaturaEquipamentoFechamento.findUnique({
      where: { mes_ano: { mes: params.mes, ano: params.ano } }
    }),
    prisma.controleQualidadeOleoFechamento.findUnique({
      where: { mes_ano: { mes: params.mes, ano: params.ano } }
    }),
    prisma.rastreabilidadeRecebimentoFechamento.findUnique({
      where: { mes_ano: { mes: params.mes, ano: params.ano } }
    }),
    prisma.planoLimpezaFechamento.findUnique({
      where: {
        tipo_mes_ano: {
          tipo: TipoPlanoLimpeza.DIARIO,
          mes: params.mes,
          ano: params.ano
        }
      }
    }),
    prisma.planoLimpezaFechamento.findUnique({
      where: {
        tipo_mes_ano: {
          tipo: TipoPlanoLimpeza.SEMANAL,
          mes: params.mes,
          ano: params.ano
        }
      }
    }),
    prisma.controleBuffetAmostraFechamento.findUnique({
      where: { mes_ano: { mes: params.mes, ano: params.ano } }
    }),
    prisma.higienizacaoHortifruti.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.controleTemperaturaEquipamento.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.controleQualidadeOleoRegistro.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.rastreabilidadeRecebimentoNota.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.planoLimpezaDiarioRegistro.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.planoLimpezaSemanalExecucao.count({
      where: { dataExecucao: { gte: params.range.start, lte: params.range.end } }
    }),
    prisma.controleBuffetAmostraRegistro.count({
      where: { data: { gte: params.range.start, lte: params.range.end } }
    })
  ]);

  const closureModules = [
    {
      id: "fechamento-hortifruti",
      name: MODULES.hortifruti.name,
      href: MODULES.hortifruti.href,
      status: fechamentoHortifruti?.status,
      count: countHortifruti
    },
    {
      id: "fechamento-temperatura",
      name: MODULES.temperatura.name,
      href: MODULES.temperatura.href,
      status: fechamentoTemperatura?.status,
      count: countTemperatura
    },
    {
      id: "fechamento-oleo",
      name: MODULES.oleo.name,
      href: MODULES.oleo.href,
      status: fechamentoOleo?.status,
      count: countOleo
    },
    {
      id: "fechamento-rastreabilidade",
      name: MODULES.rastreabilidade.name,
      href: MODULES.rastreabilidade.href,
      status: fechamentoRastreabilidade?.status,
      count: countRastreabilidade
    },
    {
      id: "fechamento-limpeza-diaria",
      name: MODULES.limpezaDiaria.name,
      href: MODULES.limpezaDiaria.href,
      status: fechamentoLimpezaDiaria?.status,
      count: countLimpezaDiaria
    },
    {
      id: "fechamento-limpeza-semanal",
      name: MODULES.limpezaSemanal.name,
      href: MODULES.limpezaSemanal.href,
      status: fechamentoLimpezaSemanal?.status,
      count: countLimpezaSemanal
    },
    {
      id: "fechamento-buffet",
      name: MODULES.buffet.name,
      href: MODULES.buffet.href,
      status: fechamentoBuffet?.status,
      count: countBuffet
    }
  ];

  const completedDetails: DashboardDetailItem[] = [];
  const pendingDetails: DashboardDetailItem[] = [];

  for (const item of closureModules) {
    const detail: DashboardDetailItem = {
      id: item.id,
      moduleId: item.id,
      moduleName: "Fechamentos Mensais",
      title: item.name,
      description:
        item.count > 0
          ? `${item.count} registro(s) no mês atual.`
          : "Sem registros no mês atual.",
      status: item.status === "ASSINADO" ? "Concluído" : "Pendente",
      dateTime: `${String(params.mes).padStart(2, "0")}/${params.ano}`,
      href: item.href
    };

    if (item.status === "ASSINADO") {
      addDetail(completedDetails, detail);
    } else {
      addDetail(pendingDetails, detail);
    }
  }

  return buildSummaryCard({
    id: "mensal",
    title: "Fechamentos Mensais",
    description: "Assinaturas mensais dos módulos com fechamento implementado.",
    total: closureModules.length,
    completed: completedDetails.length,
    pending: pendingDetails.length,
    pendingDetails,
    completedDetails
  });
}

async function buildMaintenanceStats(params: {
  user: AuthenticatedUser;
  range: { start: Date; end: Date };
}): Promise<ModuleStats> {
  const moduleInfo = MODULES.chamados;
  const stats = moduleStatsBase(moduleInfo);
  const funcionarioScope =
    params.user.perfil === "FUNCIONARIO" ? { criadoPorId: params.user.id } : {};

  const [abertos, emAndamento, concluidos] = await Promise.all([
    prisma.chamadoManutencao.findMany({
      where: {
        ...funcionarioScope,
        status: StatusChamadoManutencao.ABERTO
      },
      select: {
        id: true,
        titulo: true,
        areaLocal: true,
        status: true,
        criadoPorNome: true,
        dataHoraCriacao: true
      },
      orderBy: [{ dataHoraCriacao: "desc" }]
    }),
    prisma.chamadoManutencao.findMany({
      where: {
        ...funcionarioScope,
        status: StatusChamadoManutencao.EM_ANDAMENTO
      },
      select: {
        id: true,
        titulo: true,
        areaLocal: true,
        status: true,
        criadoPorNome: true,
        dataHoraCriacao: true
      },
      orderBy: [{ dataHoraCriacao: "desc" }]
    }),
    prisma.chamadoManutencao.findMany({
      where: {
        ...funcionarioScope,
        status: StatusChamadoManutencao.CONCLUIDO,
        dataHoraConclusao: {
          gte: params.range.start,
          lte: params.range.end
        }
      },
      select: {
        id: true,
        titulo: true,
        areaLocal: true,
        status: true,
        criadoPorNome: true,
        dataHoraConclusao: true
      },
      orderBy: [{ dataHoraConclusao: "desc" }]
    })
  ]);

  for (const chamado of abertos) {
    addPending(
      stats,
      {
        id: `${moduleInfo.id}:${chamado.id}`,
        moduleId: moduleInfo.id,
        moduleName: moduleInfo.name,
        title: chamado.titulo,
        description: chamado.areaLocal,
        status: maintenanceStatusLabel(chamado.status),
        responsible: chamado.criadoPorNome,
        dateTime: formatDateTimeDisplay(chamado.dataHoraCriacao),
        href: `${moduleInfo.href}/${chamado.id}`
      },
      "Pendente"
    );
  }

  for (const chamado of emAndamento) {
    addPending(
      stats,
      {
        id: `${moduleInfo.id}:${chamado.id}`,
        moduleId: moduleInfo.id,
        moduleName: moduleInfo.name,
        title: chamado.titulo,
        description: chamado.areaLocal,
        status: maintenanceStatusLabel(chamado.status),
        responsible: chamado.criadoPorNome,
        dateTime: formatDateTimeDisplay(chamado.dataHoraCriacao),
        href: `${moduleInfo.href}/${chamado.id}`
      },
      "Em andamento"
    );
  }

  for (const chamado of concluidos) {
    addCompleted(stats, {
      id: `${moduleInfo.id}:${chamado.id}`,
      moduleId: moduleInfo.id,
      moduleName: moduleInfo.name,
      title: chamado.titulo,
      description: chamado.areaLocal,
      status: "Concluído",
      responsible: chamado.criadoPorNome,
      dateTime: chamado.dataHoraConclusao
        ? formatDateTimeDisplay(chamado.dataHoraConclusao)
        : undefined,
      href: `${moduleInfo.href}/${chamado.id}`
    });
  }

  return stats;
}

function buildMyPendencies(params: {
  user: AuthenticatedUser;
  dailyCard: DashboardSummaryCard;
  weeklyStats: ModuleStats;
  monthlyCard: DashboardSummaryCard | null;
  maintenanceStats: ModuleStats;
}): {
  total: number;
  details: DashboardDetailItem[];
} {
  const details: DashboardDetailItem[] = [];

  const addMany = (items: DashboardDetailItem[]) => {
    for (const item of items) {
      addDetail(details, item);
    }
  };

  if (params.user.perfil === "FUNCIONARIO") {
    addMany(params.dailyCard.pendingDetails);
    addMany(params.weeklyStats.pendingDetails);
    addMany(params.maintenanceStats.pendingDetails);

    return {
      total: params.dailyCard.pending + params.weeklyStats.pending + params.maintenanceStats.pending,
      details
    };
  }

  if (params.user.perfil === "SUPERVISOR") {
    addMany(
      params.dailyCard.pendingDetails.filter(
        (item) => item.status === "Aguardando supervisor"
      )
    );
    addMany(
      params.weeklyStats.pendingDetails.filter(
        (item) => item.status === "Aguardando supervisor"
      )
    );
    addMany(params.maintenanceStats.pendingDetails);
    if (params.monthlyCard) addMany(params.monthlyCard.pendingDetails);

    return {
      total:
        (params.dailyCard.waitingSupervisor ?? 0) +
        (params.weeklyStats.waitingSupervisor ?? 0) +
        params.maintenanceStats.pending +
        (params.monthlyCard?.pending ?? 0),
      details
    };
  }

  if (params.user.perfil === "RESPONSAVEL_TECNICO") {
    addMany(params.dailyCard.pendingDetails);
    addMany(params.weeklyStats.pendingDetails);
    if (params.monthlyCard) addMany(params.monthlyCard.pendingDetails);
    addMany(params.maintenanceStats.pendingDetails);

    return {
      total:
        params.dailyCard.pending +
        params.weeklyStats.pending +
        (params.monthlyCard?.pending ?? 0) +
        params.maintenanceStats.pending,
      details
    };
  }

  addMany(params.dailyCard.pendingDetails);
  addMany(params.weeklyStats.pendingDetails);
  if (params.monthlyCard) addMany(params.monthlyCard.pendingDetails);
  addMany(params.maintenanceStats.pendingDetails);

  return {
    total:
      params.dailyCard.pending +
      params.weeklyStats.pending +
      (params.monthlyCard?.pending ?? 0) +
      params.maintenanceStats.pending,
    details
  };
}

export async function getOperationalDashboardData(params: {
  user: AuthenticatedUser;
  period: DashboardPeriod;
}): Promise<DashboardData> {
  const now = getCurrentSystemDateTime();
  const ranges = getRanges(params.period, now);
  const profileView = getProfileView(params.user);

  const [
    hortifrutiStats,
    temperatureStats,
    oilStats,
    receivingStats,
    buffetStats,
    dailyCleaningStats,
    weeklyCleaningStats,
    maintenanceStats,
    monthlyCard
  ] = await Promise.all([
    buildHortifrutiStats(ranges.daily),
    buildTemperatureStats(ranges.daily),
    buildOilStats(ranges.daily),
    buildReceivingStats(ranges.daily),
    buildBuffetStats(ranges.daily),
    buildDailyCleaningStats(ranges.daily),
    buildWeeklyCleaningStats(ranges.weekly),
    buildMaintenanceStats({ user: params.user, range: ranges.dateTime }),
    profileView.showManagement
      ? buildMonthlyClosingCard({
          mes: ranges.mes,
          ano: ranges.ano,
          range: ranges.monthly
        })
      : Promise.resolve(null)
  ]);

  const dailyStats = [
    hortifrutiStats,
    temperatureStats,
    oilStats,
    receivingStats,
    buffetStats,
    dailyCleaningStats
  ];

  const dailyCard = combineStatsToCard({
    id: "diarias",
    title: "Tarefas Diárias",
    description: `Rotinas diárias consideradas em ${formatRangeLabel(ranges.daily)}.`,
    href: "/",
    stats: dailyStats
  });

  const weeklyCard = combineStatsToCard({
    id: "semanais",
    title: "Tarefas Semanais",
    description: `Plano semanal e pendências ativas em ${formatRangeLabel(ranges.weekly)}.`,
    href: MODULES.limpezaSemanal.href,
    stats: [weeklyCleaningStats]
  });

  const maintenanceCard = buildSummaryCard({
    id: "chamados",
    title: "Chamados de Manutenção",
    description:
      params.user.perfil === "FUNCIONARIO"
        ? "Seus chamados abertos, em andamento e concluídos no período."
        : "Chamados abertos, em andamento e concluídos no período.",
    href: MODULES.chamados.href,
    total: maintenanceStats.total,
    completed: maintenanceStats.completed,
    pending: maintenanceStats.pending,
    inProgress: maintenanceStats.inProgress,
    pendingDetails: maintenanceStats.pendingDetails,
    completedDetails: maintenanceStats.completedDetails
  });

  const myPendencies = buildMyPendencies({
    user: params.user,
    dailyCard,
    weeklyStats: weeklyCleaningStats,
    monthlyCard,
    maintenanceStats
  });

  const myPendenciesCard = buildSummaryCard({
    id: "minhas-pendencias",
    title: "Minhas Pendências",
    description: "Itens que mais provavelmente precisam da sua ação pelo perfil logado.",
    total: myPendencies.total,
    completed: 0,
    pending: myPendencies.total,
    pendingDetails: myPendencies.details,
    completedDetails: []
  });

  const cards = profileView.showManagement
    ? [dailyCard, weeklyCard, monthlyCard, maintenanceCard, myPendenciesCard].filter(
        (card): card is DashboardSummaryCard => Boolean(card)
      )
    : [dailyCard, weeklyCard, maintenanceCard, myPendenciesCard];

  const moduleSummaries = [
    buildModuleSummary(hortifrutiStats),
    buildModuleSummary(temperatureStats),
    buildModuleSummary(oilStats),
    buildModuleSummary(receivingStats),
    buildModuleSummary(buffetStats),
    buildModuleSummary(dailyCleaningStats),
    buildModuleSummary(weeklyCleaningStats),
    buildModuleSummary(maintenanceStats)
  ];

  return {
    period: params.period,
    periodLabel: ranges.periodLabel,
    generatedAt: formatDateTimeDisplay(now),
    profileView,
    cards,
    myPendencies: myPendencies.details,
    moduleSummaries,
    scope: {
      daily: formatRangeLabel(ranges.daily),
      weekly: formatRangeLabel(ranges.weekly),
      monthly: `${String(ranges.mes).padStart(2, "0")}/${ranges.ano}`,
      maintenance:
        params.user.perfil === "FUNCIONARIO"
          ? "Chamados criados pelo usuário logado"
          : `Chamados abertos atuais e concluídos em ${formatRangeLabel(ranges.daily)}`
    }
  };
}
