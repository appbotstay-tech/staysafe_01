import type {
  ClassificacaoItemBuffetAmostra,
  StatusItemBuffetAmostra,
  StatusTemperaturaBuffetAmostra,
  TipoServicoBuffetAmostra
} from "@prisma/client";

import {
  formatAppDate,
  formatAppDateInput,
  formatAppDateTime,
  getAppDate,
  getAppMonthDateRange,
  getAppMonthYear,
  getAppNow,
  getAppYearDateRange,
  parseAppDateInput
} from "@/lib/date-time";

export type StatusServicoBuffet = "PENDENTE" | "PARCIAL" | "CONCLUIDO";

export type ServicoBuffetVigencia = {
  tipoServico: TipoServicoBuffetAmostra;
  dataInicio: Date | null;
  dataFim: Date | null;
};

export type AvaliacaoTemperaturaBuffet = {
  status: StatusTemperaturaBuffetAmostra;
  orientacao: string;
  exigeAcaoCorretiva: boolean;
};

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

export function formatDateInput(date: Date): string {
  return formatAppDateInput(date);
}

export function formatDateDisplay(date: Date): string {
  return formatAppDate(date);
}

export function getTipoServicoLabel(tipoServico: TipoServicoBuffetAmostra): string {
  return tipoServico === "ESPORADICO" ? "Esporádico / Eventual" : "Fixo / Recorrente";
}

export function parseTipoServico(value: string): TipoServicoBuffetAmostra | null {
  if (value === "FIXO" || value === "ESPORADICO") {
    return value;
  }

  return null;
}

export function getServicoPeriodoLabel(servico: ServicoBuffetVigencia): string {
  if (servico.tipoServico === "FIXO") {
    return "Todos os dias";
  }

  if (!servico.dataInicio) {
    return "Período não definido";
  }

  const end = servico.dataFim ?? servico.dataInicio;
  if (formatDateInput(servico.dataInicio) === formatDateInput(end)) {
    return formatDateDisplay(servico.dataInicio);
  }

  return `${formatDateDisplay(servico.dataInicio)} a ${formatDateDisplay(end)}`;
}

export function isServicoDisponivelNaData(
  servico: ServicoBuffetVigencia,
  date: Date
): boolean {
  if (servico.tipoServico === "FIXO") {
    return true;
  }

  if (!servico.dataInicio) {
    return false;
  }

  const dateKey = formatDateInput(date);
  const startKey = formatDateInput(servico.dataInicio);
  const endKey = formatDateInput(servico.dataFim ?? servico.dataInicio);

  return dateKey >= startKey && dateKey <= endKey;
}

export function formatDateTimeDisplay(date: Date): string {
  return formatAppDateTime(date);
}

export function formatTemperatureDisplay(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  })} °C`;
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

export function getYearDateRange(ano: number): { start: Date; end: Date } {
  return getAppYearDateRange(ano);
}

export function periodKey(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function getClassificacaoLabel(
  classificacao: ClassificacaoItemBuffetAmostra
): string {
  if (classificacao === "QUENTE") {
    return "Quentes";
  }

  if (classificacao === "FRIO") {
    return "Frios";
  }

  return "Temperatura Ambiente";
}

export function getStatusItemLabel(status: StatusItemBuffetAmostra): string {
  if (status === "PREENCHIDO") {
    return "Preenchido";
  }

  if (status === "ASSINADO") {
    return "Assinado";
  }

  return "Pendente";
}

export function getStatusTemperaturaLabel(
  status: StatusTemperaturaBuffetAmostra
): string {
  if (status === "ALERTA") {
    return "Alerta";
  }

  if (status === "CRITICO") {
    return "Crítico";
  }

  return "Conforme";
}

export function getStatusServicoLabel(status: StatusServicoBuffet): string {
  if (status === "PARCIAL") {
    return "Parcial";
  }

  if (status === "CONCLUIDO") {
    return "Concluído";
  }

  return "Pendente";
}

export function avaliarTemperaturaBuffet(
  classificacao: ClassificacaoItemBuffetAmostra,
  temperaturaReferencia: number
): AvaliacaoTemperaturaBuffet {
  if (classificacao === "QUENTE") {
    if (temperaturaReferencia > 60) {
      return {
        status: "CONFORME",
        orientacao: "Acima de 60°C: exposição permitida por no máximo 6 horas.",
        exigeAcaoCorretiva: false
      };
    }

    return {
      status: "CRITICO",
      orientacao: "Abaixo de 60°C: exposição permitida por no máximo 1 hora.",
      exigeAcaoCorretiva: true
    };
  }

  if (classificacao === "FRIO") {
    if (temperaturaReferencia <= 10) {
      return {
        status: "CONFORME",
        orientacao: "Até 10°C: exposição permitida por no máximo 4 horas.",
        exigeAcaoCorretiva: false
      };
    }

    if (temperaturaReferencia <= 21) {
      return {
        status: "ALERTA",
        orientacao: "Entre 10°C e 21°C: exposição permitida por no máximo 2 horas.",
        exigeAcaoCorretiva: true
      };
    }

    return {
      status: "CRITICO",
      orientacao: "Acima de 21°C: fora do padrão para alimento frio.",
      exigeAcaoCorretiva: true
    };
  }

  return {
    status: "CONFORME",
    orientacao:
      "Temperatura ambiente: registro realizado para rastreabilidade, sem regra automática de frio ou quente.",
    exigeAcaoCorretiva: false
  };
}

export function calcularStatusServico(params: {
  totalItens: number;
  itensAssinados: number;
  itensIniciados: number;
}): StatusServicoBuffet {
  if (params.totalItens <= 0 || params.itensIniciados <= 0) {
    return "PENDENTE";
  }

  if (params.itensAssinados >= params.totalItens) {
    return "CONCLUIDO";
  }

  return "PARCIAL";
}
