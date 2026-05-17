import { StatusPlanoLimpeza, TurnoPlanoLimpeza } from "@prisma/client";

import {
  formatAppDate,
  formatAppDateInput,
  formatAppDateTime,
  getAppDate,
  getAppMonthDateRange,
  getAppMonthYear,
  getAppNow,
  getAppWeekDateRange,
  getAppYearDateRange,
  parseAppDateInput
} from "@/lib/date-time";

const WEEKLY_DAY_VALUES = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO"
] as const;

export type WeeklyDayValue = (typeof WEEKLY_DAY_VALUES)[number];

const WEEKLY_DAY_LABELS: Record<WeeklyDayValue, string> = {
  SEGUNDA: "Segunda-feira",
  TERCA: "Terça-feira",
  QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
  SABADO: "Sábado",
  DOMINGO: "Domingo"
};

const WEEKLY_DAY_TOKENS: Record<string, WeeklyDayValue> = {
  seg: "SEGUNDA",
  segunda: "SEGUNDA",
  segundafeira: "SEGUNDA",
  ter: "TERCA",
  terca: "TERCA",
  tercafeira: "TERCA",
  qua: "QUARTA",
  quarta: "QUARTA",
  quartafeira: "QUARTA",
  qui: "QUINTA",
  quinta: "QUINTA",
  quintafeira: "QUINTA",
  sex: "SEXTA",
  sexta: "SEXTA",
  sextafeira: "SEXTA",
  sab: "SABADO",
  sabado: "SABADO",
  dom: "DOMINGO",
  domingo: "DOMINGO"
};

function normalizeWeekdayInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseDateInput(value: string): Date | null {
  return parseAppDateInput(value);
}

export function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function formatDateInput(date: Date): string {
  return formatAppDateInput(date);
}

export function formatDateDisplay(date: Date): string {
  return formatAppDate(date);
}

export function formatDateTimeDisplay(date: Date): string {
  return formatAppDateTime(date);
}

export function getTodaySystemDate(): Date {
  return getAppDate();
}

export function getCurrentSystemDateTime(): Date {
  return getAppNow();
}

export function getMonthYear(date: Date): { mes: number; ano: number } {
  return getAppMonthYear(date);
}

export function getMonthDateRange(mes: number, ano: number): {
  start: Date;
  end: Date;
} {
  return getAppMonthDateRange(mes, ano);
}

export function getCurrentWeekDateRange(referenceDate: Date = getAppNow()): {
  start: Date;
  end: Date;
} {
  return getAppWeekDateRange(referenceDate);
}

export function getWeekDateRangeForDate(date: Date): {
  start: Date;
  end: Date;
} {
  return getAppWeekDateRange(date);
}

export function getWeekStartDateForDate(date: Date): Date {
  return getWeekDateRangeForDate(date).start;
}

export function getYearDateRange(ano: number): { start: Date; end: Date } {
  return getAppYearDateRange(ano);
}

export function periodKey(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function isWeeklyDayValue(value: string): value is WeeklyDayValue {
  return WEEKLY_DAY_VALUES.includes(value as WeeklyDayValue);
}

export function getWeeklyDayValuesFromInput(value: string): WeeklyDayValue[] {
  const normalized = normalizeWeekdayInput(value);
  if (!normalized) {
    return [];
  }

  const values = new Set<WeeklyDayValue>();
  const directToken = normalized.replace(/[^a-z]/g, "");
  const directValue = WEEKLY_DAY_TOKENS[directToken];
  if (directValue) {
    values.add(directValue);
  }

  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    const dayValue = WEEKLY_DAY_TOKENS[token];
    if (dayValue) {
      values.add(dayValue);
    }
  }

  if (isWeeklyDayValue(value.trim().toUpperCase())) {
    values.add(value.trim().toUpperCase() as WeeklyDayValue);
  }

  return WEEKLY_DAY_VALUES.filter((dayValue) => values.has(dayValue));
}

export function parseWeeklyDay(value: string): WeeklyDayValue | null {
  const values = getWeeklyDayValuesFromInput(value);
  return values[0] ?? null;
}

export function getWeeklyDayLabel(value: string): string {
  const parsed = parseWeeklyDay(value);
  if (!parsed) {
    return value;
  }

  return WEEKLY_DAY_LABELS[parsed];
}

export function getWeeklyDayValueFromDate(date: Date): WeeklyDayValue {
  const day = date.getUTCDay();

  if (day === 1) return "SEGUNDA";
  if (day === 2) return "TERCA";
  if (day === 3) return "QUARTA";
  if (day === 4) return "QUINTA";
  if (day === 5) return "SEXTA";
  if (day === 6) return "SABADO";
  return "DOMINGO";
}

export function getStatusLabel(status: StatusPlanoLimpeza): string {
  if (status === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR) {
    return "Aguardando Supervisor";
  }

  return status === StatusPlanoLimpeza.CONCLUIDO ? "Concluído" : "Pendente";
}

export function getTurnoLabel(turno: TurnoPlanoLimpeza): string {
  if (turno === TurnoPlanoLimpeza.MANHA) return "Manhã";
  if (turno === TurnoPlanoLimpeza.TARDE) return "Tarde";
  return "Noite";
}

export function parseDailyStatus(value: string): StatusPlanoLimpeza | null {
  if (value === StatusPlanoLimpeza.PENDENTE) return StatusPlanoLimpeza.PENDENTE;
  if (value === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR) {
    return StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR;
  }
  if (value === StatusPlanoLimpeza.CONCLUIDO) return StatusPlanoLimpeza.CONCLUIDO;
  return null;
}

export function parseWeeklyStatus(value: string): StatusPlanoLimpeza | null {
  if (value === StatusPlanoLimpeza.PENDENTE) return StatusPlanoLimpeza.PENDENTE;
  if (value === StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR) {
    return StatusPlanoLimpeza.AGUARDANDO_SUPERVISOR;
  }
  if (value === StatusPlanoLimpeza.CONCLUIDO) return StatusPlanoLimpeza.CONCLUIDO;
  return null;
}

export function parseTurno(value: string): TurnoPlanoLimpeza | null {
  if (value === TurnoPlanoLimpeza.MANHA) return TurnoPlanoLimpeza.MANHA;
  if (value === TurnoPlanoLimpeza.TARDE) return TurnoPlanoLimpeza.TARDE;
  if (value === TurnoPlanoLimpeza.NOITE) return TurnoPlanoLimpeza.NOITE;
  return null;
}
