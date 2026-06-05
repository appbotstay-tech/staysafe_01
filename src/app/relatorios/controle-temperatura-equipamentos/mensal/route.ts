import { NextResponse, type NextRequest } from "next/server";

import {
  StatusFechamentoTemperaturaEquipamento,
  TipoOpcaoTemperaturaEquipamento,
  TurnoTemperaturaEquipamento
} from "@prisma/client";

import { APP_NAME } from "@/lib/app-branding";
import { getCurrentUser } from "@/lib/auth-session";
import {
  formatAppDateTime,
  getAppDate,
  getAppMonthDateRange,
  getAppMonthYear,
  getAppNow
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { canAccessReports } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const MODULE_CODE = "temperatura";
const MODULE_NAME = "Controle de Temperatura dos Equipamentos";
const REPORT_TITLE = "CONTROLE DE TEMPERATURA DOS EQUIPAMENTOS";
const REPORT_NAME = "Relatório mensal - temperatura dos equipamentos";
const DEFAULT_SHIFTS = [
  TurnoTemperaturaEquipamento.MANHA,
  TurnoTemperaturaEquipamento.TARDE
];

type TemperatureGridRow = {
  equipamento: string;
  turno: TurnoTemperaturaEquipamento;
  temperaturesByDay: Map<number, string>;
};

type MonthlyTemperatureReport = {
  month: number;
  year: number;
  monthYearLabel: string;
  unitName: string;
  emittedAt: string;
  rows: TemperatureGridRow[];
  days: number[];
  closureResponsible: string;
  closureDate: string;
  closureStatus: string;
};

function parseMonth(value: string | null): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
}

function parseYear(value: string | null): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 2020 && parsed <= 2100 ? parsed : null;
}

function getConfiguredUnitName(): string {
  return (
    process.env.STAYSAFE_UNIT_NAME?.trim() ||
    process.env.BPMA_UNIT_NAME?.trim() ||
    "Unidade não informada"
  );
}

function getMonthName(month: number): string {
  const monthNames = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];

  return monthNames[month - 1] ?? "";
}

function formatMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

function formatGeneratedAtSentence(date: Date): string {
  const [datePart, timePart] = formatAppDateTime(date).split(" ");
  return `${datePart} às ${timePart ?? ""}`.trim();
}

function formatTemperature(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1
  })} °C`;
}

function labelTurno(turno: TurnoTemperaturaEquipamento): string {
  return turno === TurnoTemperaturaEquipamento.MANHA ? "Manhã" : "Tarde";
}

function configuredShifts(equipment: {
  turnoManha?: boolean | null;
  turnoTarde?: boolean | null;
} | null): TurnoTemperaturaEquipamento[] {
  if (!equipment) {
    return DEFAULT_SHIFTS;
  }

  const shifts: TurnoTemperaturaEquipamento[] = [];
  if (equipment.turnoManha) shifts.push(TurnoTemperaturaEquipamento.MANHA);
  if (equipment.turnoTarde) shifts.push(TurnoTemperaturaEquipamento.TARDE);

  return shifts.length > 0 ? shifts : DEFAULT_SHIFTS;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStyles(): string {
  return `
    <style>
      @page {
        size: A4 landscape;
        margin: 8mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        line-height: 1.25;
      }

      body {
        padding: 14px;
      }

      .report-page {
        max-width: 1420px;
        margin: 0 auto;
        background: #ffffff;
      }

      .screen-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 10px;
      }

      .screen-actions button {
        border: 1px solid #111827;
        border-radius: 6px;
        background: #111827;
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        padding: 7px 10px;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        color: #000000;
      }

      th,
      td {
        border: 1px solid #000000;
        padding: 3px 4px;
        text-align: center;
        vertical-align: middle;
      }

      th {
        background: #f2f2f2;
        font-weight: 700;
      }

      .header-table {
        table-layout: fixed;
        margin-bottom: 8px;
      }

      .brand-cell {
        width: 20%;
        font-size: 13px;
        text-align: center;
      }

      .brand-cell span {
        display: block;
        margin-top: 3px;
        font-size: 9px;
        font-weight: 400;
      }

      .title-cell {
        width: 54%;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0;
        text-align: center;
      }

      .month-cell {
        width: 26%;
        font-size: 11px;
        text-align: center;
      }

      .meta-line {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 10px;
      }

      .temperature-grid {
        min-width: 1160px;
        table-layout: fixed;
      }

      .equipment-head,
      .equipment-cell {
        width: 18%;
        text-align: left;
      }

      .shift-head,
      .shift-cell {
        width: 7%;
      }

      .day-head,
      .day-cell {
        width: 2.4%;
        min-width: 24px;
      }

      .equipment-cell {
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .day-cell {
        height: 22px;
        font-size: 8px;
        white-space: nowrap;
      }

      .empty-message {
        height: 28px;
        text-align: center;
      }

      .signature-table {
        table-layout: fixed;
        margin-top: 12px;
      }

      .signature-table th,
      .signature-table td {
        height: 30px;
        text-align: left;
        white-space: nowrap;
      }

      .signature-table th:first-child {
        width: 28%;
      }

      .signature-table td:nth-child(2) {
        width: 44%;
      }

      .signature-table th:nth-child(3) {
        width: 7%;
      }

      .signature-table td:nth-child(4) {
        width: 21%;
      }

      @media print {
        body {
          padding: 0;
          font-size: 8px;
        }

        .screen-actions {
          display: none;
        }

        .report-page {
          max-width: none;
        }

        .table-wrap {
          overflow: visible;
        }

        .temperature-grid {
          min-width: 0;
        }

        th,
        td {
          padding: 2px;
        }

        .day-cell {
          font-size: 7px;
          height: 18px;
        }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }
      }
    </style>`;
}

function renderHeader(report: MonthlyTemperatureReport): string {
  return `
    <header>
      <table class="header-table">
        <tbody>
          <tr>
            <td class="brand-cell">
              <strong>${escapeHtml(APP_NAME)}</strong>
              <span>${escapeHtml(report.unitName)}</span>
            </td>
            <td class="title-cell">${escapeHtml(REPORT_TITLE)}</td>
            <td class="month-cell">
              <strong>Mês/Ano</strong><br />
              ${escapeHtml(report.monthYearLabel)}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="meta-line">
        <span><strong>Relatório:</strong> ${escapeHtml(REPORT_NAME)}</span>
        <span><strong>Módulo:</strong> ${escapeHtml(MODULE_NAME)}</span>
        <span><strong>Emissão:</strong> ${escapeHtml(report.emittedAt)}</span>
        <span><strong>Fechamento mensal:</strong> ${escapeHtml(report.closureStatus)}</span>
      </div>
    </header>`;
}

function renderTemperatureGrid(report: MonthlyTemperatureReport): string {
  const dayHeaders = report.days
    .map((day) => `<th class="day-head">${day}</th>`)
    .join("");

  const rows =
    report.rows.length > 0
      ? report.rows
          .map((row, rowIndex, rows) => {
            const equipmentRowSpan = rows.filter(
              (candidate) => candidate.equipamento === row.equipamento
            ).length;
            const isFirstEquipmentRow =
              rowIndex === 0 || rows[rowIndex - 1]?.equipamento !== row.equipamento;
            const equipmentCell = isFirstEquipmentRow
              ? `<td class="equipment-cell" rowspan="${equipmentRowSpan}">${escapeHtml(row.equipamento)}</td>`
              : "";
            const cells = report.days
              .map(
                (day) =>
                  `<td class="day-cell">${escapeHtml(row.temperaturesByDay.get(day) ?? "")}</td>`
              )
              .join("");

            return `
              <tr>
                ${equipmentCell}
                <td class="shift-cell">${escapeHtml(labelTurno(row.turno))}</td>
                ${cells}
              </tr>`;
          })
          .join("")
      : `
        <tr>
          <td colspan="${report.days.length + 2}" class="empty-message">
            Nenhum equipamento encontrado para o mês de referência.
          </td>
        </tr>`;

  return `
    <div class="table-wrap">
      <table class="temperature-grid">
        <thead>
          <tr>
            <th class="equipment-head">Equipamento</th>
            <th class="shift-head">Turno</th>
            ${dayHeaders}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}

function renderFooter(report: MonthlyTemperatureReport): string {
  const responsible =
    report.closureResponsible.trim() || "________________________________________";
  const date = report.closureDate.trim() || "___/___/____";

  return `
    <footer>
      <table class="signature-table">
        <tbody>
          <tr>
            <th>Responsável Técnico / Nutricionista / Supervisor:</th>
            <td>${escapeHtml(responsible)}</td>
            <th>Data:</th>
            <td>${escapeHtml(date)}</td>
          </tr>
        </tbody>
      </table>
    </footer>`;
}

function renderReportDocument(report: MonthlyTemperatureReport): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(REPORT_TITLE)} - ${escapeHtml(report.monthYearLabel)}</title>
    ${renderStyles()}
  </head>
  <body>
    <main class="report-page">
      <div class="screen-actions">
        <button type="button" onclick="window.print()">Imprimir / Salvar PDF</button>
      </div>
      ${renderHeader(report)}
      ${renderTemperatureGrid(report)}
      ${renderFooter(report)}
    </main>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!canAccessReports(user)) {
    return NextResponse.redirect(new URL("/acesso-negado", request.url));
  }

  const currentMonthYear = getAppMonthYear(getAppDate());
  const month = parseMonth(request.nextUrl.searchParams.get("mes")) ?? currentMonthYear.mes;
  const year = parseYear(request.nextUrl.searchParams.get("ano")) ?? currentMonthYear.ano;
  const monthRange = getAppMonthDateRange(month, year);
  const days = Array.from({ length: monthRange.end.getUTCDate() }, (_, index) => index + 1);
  const generatedAt = getAppNow();

  const [equipmentOptions, records, genericMonthlyClosure, legacyMonthlyClosure] =
    await Promise.all([
      prisma.controleTemperaturaEquipamentoOpcao.findMany({
        where: { tipo: TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO },
        select: {
          nome: true,
          ativo: true,
          turnoManha: true,
          turnoTarde: true
        },
        orderBy: [{ ativo: "desc" }, { nome: "asc" }]
      }),
      prisma.controleTemperaturaEquipamento.findMany({
        where: {
          data: {
            gte: monthRange.start,
            lte: monthRange.end
          }
        },
        select: {
          data: true,
          equipamento: true,
          turno: true,
          temperaturaAferida: true,
          createdAt: true
        },
        orderBy: [{ createdAt: "desc" }]
      }),
      prisma.fechamentoMensalModulo.findUnique({
        where: {
          moduloCodigo_ano_mes: {
            moduloCodigo: MODULE_CODE,
            ano: year,
            mes: month
          }
        }
      }),
      prisma.controleTemperaturaEquipamentoFechamento.findUnique({
        where: { mes_ano: { mes: month, ano: year } }
      })
    ]);

  const recordsByKey = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const day = record.data.getUTCDate();
    const key = `${record.equipamento}|${record.turno}|${day}`;
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, record);
    }
  }

  const recordsByEquipment = new Map<string, (typeof records)[number][]>();
  for (const record of records) {
    const group = recordsByEquipment.get(record.equipamento) ?? [];
    group.push(record);
    recordsByEquipment.set(record.equipamento, group);
  }

  const optionsByName = new Map(equipmentOptions.map((option) => [option.nome, option]));
  const equipmentNames: string[] = [];
  for (const option of equipmentOptions) {
    if (option.ativo || recordsByEquipment.has(option.nome)) {
      equipmentNames.push(option.nome);
    }
  }

  const extraEquipmentNames = Array.from(recordsByEquipment.keys())
    .filter((name) => !optionsByName.has(name))
    .sort((first, second) => first.localeCompare(second, "pt-BR"));

  equipmentNames.push(...extraEquipmentNames);

  const rows: TemperatureGridRow[] = equipmentNames.flatMap((equipmentName) => {
    const option = optionsByName.get(equipmentName) ?? null;

    return configuredShifts(option).map((turno) => {
      const temperaturesByDay = new Map<number, string>();

      for (const day of days) {
        const record = recordsByKey.get(`${equipmentName}|${turno}|${day}`);
        const temperature = formatTemperature(record?.temperaturaAferida);
        if (temperature) {
          temperaturesByDay.set(day, temperature);
        }
      }

      return {
        equipamento: equipmentName,
        turno,
        temperaturesByDay
      };
    });
  });

  const closureResponsible =
    genericMonthlyClosure?.usuarioNomeSnapshot ??
    (legacyMonthlyClosure?.status === StatusFechamentoTemperaturaEquipamento.ASSINADO
      ? legacyMonthlyClosure.responsavelTecnico
      : "");
  const closureDate =
    genericMonthlyClosure
      ? formatGeneratedAtSentence(genericMonthlyClosure.assinadoEm)
      : legacyMonthlyClosure?.status === StatusFechamentoTemperaturaEquipamento.ASSINADO
        ? formatGeneratedAtSentence(legacyMonthlyClosure.dataAssinatura)
        : "";

  const report: MonthlyTemperatureReport = {
    month,
    year,
    monthYearLabel: formatMonthYear(month, year),
    unitName: getConfiguredUnitName(),
    emittedAt: formatAppDateTime(generatedAt),
    rows,
    days,
    closureResponsible,
    closureDate,
    closureStatus: closureResponsible ? "Assinado digitalmente" : "Pendente de assinatura"
  };

  return new NextResponse(renderReportDocument(report), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
