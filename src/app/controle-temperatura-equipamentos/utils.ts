import {
  formatAppDate,
  formatAppDateInput,
  formatAppDateTime,
  getAppDate,
  getAppHour,
  getAppMonthDateRange,
  getAppMonthYear,
  getAppNow,
  getAppYearDateRange,
  parseAppDateInput
} from "@/lib/date-time";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type CategoriaTemperatura = "REFRIGERACAO" | "CONGELAMENTO" | "QUENTE";
export type TurnoTemperatura = "MANHA" | "TARDE";
export type StatusTemperatura = "CONFORME" | "ALERTA" | "CRITICO";
export type StatusOperacionalTemperatura = "EM_OPERACAO" | "MANUTENCAO" | "INATIVO";
export type CategoriaParametrosTemperatura = {
  temperaturaIdealMin: number | null;
  temperaturaIdealMax: number | null;
  temperaturaAlertaMin: number | null;
  temperaturaAlertaMax: number | null;
  temperaturaCriticaMin: number | null;
  temperaturaCriticaMax: number | null;
};
export type CategoriaAcoesTemperatura = {
  acaoIdeal: string;
  acaoAlerta: string;
  acaoCritica: string;
  orientacaoCorretivaPadrao: string;
};
export type RegraTemperaturaCategoria = {
  temperaturaMin: number | null;
  temperaturaMax: number | null;
  status: StatusTemperatura;
  acaoCorretiva: string;
  ordem: number;
  isActive?: boolean;
};

export function parseDateInput(value: string): Date | null {
  return parseAppDateInput(value);
}

export function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

export function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseTemperatureInput(value: string): number | null {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function parseNullableTemperatureInput(
  value: string
): number | null | "invalid" {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = parseTemperatureInput(trimmed);
  if (parsed === null) {
    return "invalid";
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

export function formatTemperatureDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Não aplicável";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  })} °C`;
}

function formatTemperatureValue(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  });
}

export function formatTemperatureRange(
  min: number | null,
  max: number | null
): string {
  if (min !== null && max !== null) {
    if (min === max) {
      return `${formatTemperatureValue(min)} °C`;
    }

    return `De ${formatTemperatureValue(min)} °C até ${formatTemperatureValue(max)} °C`;
  }

  if (min === null && max !== null) {
    return `Até ${formatTemperatureValue(max)} °C`;
  }

  if (min !== null && max === null) {
    return `Acima de ${formatTemperatureValue(min)} °C`;
  }

  return "Não configurada";
}

export function getTodaySystemDate(): Date {
  return getAppDate();
}

export function getCurrentSystemDateTime(): Date {
  return getAppNow();
}

export function getCurrentShift(date = getAppNow()): TurnoTemperatura {
  return getAppHour(date) < 12 ? "MANHA" : "TARDE";
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

export function getYearDateRange(ano: number): { start: Date; end: Date } {
  return getAppYearDateRange(ano);
}

export function periodKey(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function isInRange(value: number, min: number | null, max: number | null): boolean {
  if (min === null && max === null) {
    return false;
  }

  if (min !== null && value < min) {
    return false;
  }

  if (max !== null && value > max) {
    return false;
  }

  return true;
}

export function findMatchingTemperatureRule<T extends RegraTemperaturaCategoria>(
  temperatura: number,
  regras: T[]
): T | null {
  const regrasOrdenadas = [...regras].sort((a, b) => a.ordem - b.ordem);

  for (const regra of regrasOrdenadas) {
    if (regra.isActive === false) {
      continue;
    }

    if (isInRange(temperatura, regra.temperaturaMin, regra.temperaturaMax)) {
      return regra;
    }
  }

  return null;
}

export function classifyTemperatureByParameters(
  temperatura: number,
  parametros: CategoriaParametrosTemperatura
): StatusTemperatura {
  if (
    isInRange(
      temperatura,
      parametros.temperaturaIdealMin,
      parametros.temperaturaIdealMax
    )
  ) {
    return "CONFORME";
  }

  if (
    isInRange(
      temperatura,
      parametros.temperaturaAlertaMin,
      parametros.temperaturaAlertaMax
    )
  ) {
    return "ALERTA";
  }

  if (
    isInRange(
      temperatura,
      parametros.temperaturaCriticaMin,
      parametros.temperaturaCriticaMax
    )
  ) {
    return "CRITICO";
  }

  return parametros.temperaturaCriticaMin !== null ||
    parametros.temperaturaCriticaMax !== null
    ? "CRITICO"
    : "ALERTA";
}

export function isCorrectiveActionRequired(status: StatusTemperatura): boolean {
  return status === "ALERTA" || status === "CRITICO";
}

export function getAutomaticCorrectiveAction(
  status: StatusTemperatura,
  acoes: CategoriaAcoesTemperatura
): string {
  const acaoIdeal = acoes.acaoIdeal.trim();
  const acaoAlerta = acoes.acaoAlerta.trim();
  const acaoCritica = acoes.acaoCritica.trim();
  const orientacaoPadrao = acoes.orientacaoCorretivaPadrao.trim();

  if (status === "CONFORME") {
    return acaoIdeal || orientacaoPadrao;
  }

  if (status === "ALERTA") {
    return acaoAlerta || orientacaoPadrao;
  }

  return acaoCritica || orientacaoPadrao;
}

export function getStatusLabel(status: StatusTemperatura): string {
  if (status === "CONFORME") {
    return "Normal";
  }

  if (status === "ALERTA") {
    return "Alerta";
  }

  return "Crítico";
}

export function getOperationalStatusLabel(
  status: StatusOperacionalTemperatura
): string {
  if (status === "MANUTENCAO") {
    return "Manutenção";
  }

  if (status === "INATIVO") {
    return "Inativo";
  }

  return "Em Operação";
}

export function isOperationalTemperatureStatus(
  status: StatusOperacionalTemperatura
): boolean {
  return status === "EM_OPERACAO";
}

export function getShiftLabel(turno: TurnoTemperatura): string {
  return turno === "MANHA" ? "Manhã" : "Tarde";
}

export function getCategoriaLabel(categoria: CategoriaTemperatura): string {
  if (categoria === "REFRIGERACAO") {
    return "Refrigeração";
  }

  if (categoria === "CONGELAMENTO") {
    return "Congelamento";
  }

  return "Quente";
}
