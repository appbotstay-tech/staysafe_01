import {
  ModuloDocumento,
  Prisma,
  StatusFechamentoTemperaturaEquipamento,
  StatusOperacionalEquipamento,
  StatusTemperaturaEquipamento,
  TipoOpcaoTemperaturaEquipamento,
  TurnoTemperaturaEquipamento,
  type ControleTemperaturaEquipamento
} from "@prisma/client";
import Link from "next/link";

import { SignatureContextCard } from "@/components/auth/signature-context-card";
import { DocumentosModuleHeader } from "@/components/documentos/documentos-module-header";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import { getImageDataUrl } from "@/lib/image-upload";
import { prisma } from "@/lib/prisma";
import {
  canDeleteOperationalRecords,
  canManageModuleOptions,
  canViewManagementSections,
  getRoleLabel
} from "@/lib/rbac";

import {
  closeMonthAction,
  createRegistroAction,
  deleteRegistroAction,
  reopenMonthAction,
  updateRegistroAction
} from "./actions";
import { AutomaticCorrectiveActionFields } from "./automatic-corrective-action-fields";
import { ReopenMonthModal } from "./reopen-month-modal";
import { TemperatureStatusBadge } from "./temperature-status-badge";
import {
  formatDateInput,
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTemperatureDisplay,
  getCurrentShift,
  getCurrentSystemDateTime,
  getMonthDateRange,
  getMonthYear,
  getOperationalStatusLabel,
  getShiftLabel,
  getTodaySystemDate,
  getYearDateRange,
  isOperationalTemperatureStatus,
  parseDateInput,
  parsePositiveInt,
  periodKey
} from "./utils";

const MODULE_PATH = "/controle-temperatura-equipamentos";
const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";

const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" }
];

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };
type DailyClosingStatus = "NORMAL" | "ALERTA" | "OCORRENCIA" | "PARCIAL";
type DailyClosingSummary = {
  key: string;
  data: Date;
  total: number;
  normais: number;
  alertas: number;
  criticas: number;
  justificados: number;
  acoesCorretivas: number;
  fotosAnexadas: number;
  responsaveis: string[];
  responsaveisResumo: string;
  expectedTotal: number;
  missingTotal: number;
  situacao: DailyClosingStatus;
  registros: ControleTemperaturaEquipamento[];
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPathWithParams(params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${MODULE_PATH}?${queryString}` : MODULE_PATH;
}

function parseStatusFilter(value: string): StatusTemperaturaEquipamento | null {
  if (value === StatusTemperaturaEquipamento.CONFORME) {
    return StatusTemperaturaEquipamento.CONFORME;
  }

  if (value === StatusTemperaturaEquipamento.ALERTA) {
    return StatusTemperaturaEquipamento.ALERTA;
  }

  if (value === StatusTemperaturaEquipamento.CRITICO) {
    return StatusTemperaturaEquipamento.CRITICO;
  }

  return null;
}

function hasUsefulText(value: string | null): boolean {
  return Boolean(value?.trim());
}

function summarizeResponsaveis(values: string[]): string {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );

  if (uniqueValues.length === 0) {
    return "-";
  }

  if (uniqueValues.length <= 2) {
    return uniqueValues.join(", ");
  }

  return `${uniqueValues.slice(0, 2).join(", ")} +${uniqueValues.length - 2}`;
}

function isOperationalRecord(registro: ControleTemperaturaEquipamento): boolean {
  return isOperationalTemperatureStatus(registro.statusOperacionalEquipamento);
}

function getDailyClosingStatus(summary: {
  total: number;
  alertas: number;
  criticas: number;
  missingTotal: number;
}): DailyClosingStatus {
  if (summary.criticas > 0) {
    return "OCORRENCIA";
  }

  if (summary.alertas > 0) {
    return "ALERTA";
  }

  if (summary.missingTotal > 0 || summary.total === 0) {
    return "PARCIAL";
  }

  return "NORMAL";
}

function getDailyClosingStatusLabel(status: DailyClosingStatus): string {
  if (status === "NORMAL") {
    return "Normal";
  }

  if (status === "ALERTA") {
    return "Com alerta";
  }

  if (status === "OCORRENCIA") {
    return "Com ocorrência";
  }

  return "Parcial";
}

function getDailyClosingStatusClassName(status: DailyClosingStatus): string {
  if (status === "NORMAL") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === "ALERTA") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  if (status === "OCORRENCIA") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function buildDailyClosingSummaries(
  registros: ControleTemperaturaEquipamento[],
  equipamentosAtivos: string[]
): DailyClosingSummary[] {
  const expectedTotal = equipamentosAtivos.length > 0 ? equipamentosAtivos.length * 2 : 0;
  const grouped = new Map<string, ControleTemperaturaEquipamento[]>();

  for (const registro of registros) {
    const key = formatDateInput(registro.data);
    grouped.set(key, [...(grouped.get(key) ?? []), registro]);
  }

  return Array.from(grouped.entries()).map(([key, dayRecords]) => {
    const total = dayRecords.length;
    const operationalRecords = dayRecords.filter(isOperationalRecord);
    const justificados = total - operationalRecords.length;
    const normais = operationalRecords.filter(
      (registro) => registro.status === StatusTemperaturaEquipamento.CONFORME
    ).length;
    const alertas = operationalRecords.filter(
      (registro) => registro.status === StatusTemperaturaEquipamento.ALERTA
    ).length;
    const criticas = operationalRecords.filter(
      (registro) => registro.status === StatusTemperaturaEquipamento.CRITICO
    ).length;
    const acoesCorretivas = operationalRecords.filter((registro) =>
      hasUsefulText(registro.acaoCorretiva)
    ).length;
    const fotosAnexadas = operationalRecords.filter(
      (registro) => registro.fotoMimeType && registro.fotoBase64
    ).length;
    const responsaveis = dayRecords.map((registro) => registro.responsavel);
    const missingTotal = expectedTotal > total ? expectedTotal - total : 0;
    const statusBase = { total, alertas, criticas, missingTotal };

    return {
      key,
      data: dayRecords[0]?.data ?? parseDateInput(key) ?? new Date(),
      total,
      normais,
      alertas,
      criticas,
      justificados,
      acoesCorretivas,
      fotosAnexadas,
      responsaveis,
      responsaveisResumo: summarizeResponsaveis(responsaveis),
      expectedTotal,
      missingTotal,
      situacao: getDailyClosingStatus(statusBase),
      registros: dayRecords
    };
  });
}

export default async function ControleTemperaturaEquipamentosPage({
  searchParams
}: PageProps) {
  const authUser = await getCurrentUser();
  const responsavelLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const podeVerGestao = authUser ? canViewManagementSections(authUser.perfil) : false;
  const podeGerenciarOpcoes = authUser ? canManageModuleOptions(authUser.perfil) : false;
  const podeExcluirRegistros = authUser ? canDeleteOperationalRecords(authUser.perfil) : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  const now = getCurrentSystemDateTime();
  const todayDateInput = formatDateInput(now);

  const filtroDataRaw = firstParam(params.filtroData).trim();
  const filtroMesRaw = firstParam(params.filtroMes).trim();
  const filtroAnoRaw = firstParam(params.filtroAno).trim();
  const filtroStatusRaw = firstParam(params.filtroStatus).trim();
  const filtroEquipamento = firstParam(params.filtroEquipamento).trim();
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const hasManualFilters = Boolean(
    filtroDataRaw ||
      filtroMesRaw ||
      filtroAnoRaw ||
      filtroEquipamento ||
      filtroStatusRaw ||
      filtroResponsavel
  );
  const filtroData = hasManualFilters ? filtroDataRaw : todayDateInput;
  const filtroMes = parsePositiveInt(filtroMesRaw);
  const filtroAno = parsePositiveInt(filtroAnoRaw);
  const filtroStatus = parseStatusFilter(filtroStatusRaw);

  const where: Prisma.ControleTemperaturaEquipamentoWhereInput = {};
  const dataFiltro = parseDateInput(filtroData);

  if (dataFiltro) {
    where.data = dataFiltro;
  } else if (filtroMes && filtroAno && filtroMes <= 12) {
    const { start, end } = getMonthDateRange(filtroMes, filtroAno);
    where.data = { gte: start, lte: end };
  } else if (filtroAno) {
    const { start, end } = getYearDateRange(filtroAno);
    where.data = { gte: start, lte: end };
  }

  if (filtroEquipamento) {
    where.equipamento = { contains: filtroEquipamento, mode: "insensitive" };
  }

  if (filtroStatus) {
    where.status = filtroStatus;
    where.statusOperacionalEquipamento = StatusOperacionalEquipamento.EM_OPERACAO;
  }

  if (filtroResponsavel) {
    where.responsavel = { contains: filtroResponsavel, mode: "insensitive" };
  }

  const [registros, options, categoryRules] = await Promise.all([
    prisma.controleTemperaturaEquipamento.findMany({
      where,
      orderBy: [{ data: "desc" }, { createdAt: "desc" }]
    }),
    prisma.controleTemperaturaEquipamentoOpcao.findMany({
      orderBy: [{ tipo: "asc" }, { ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.controleTemperaturaCategoriaRegra.findMany({
      where: { isActive: true },
      include: { categoria: { select: { categoria: true } } },
      orderBy: [{ categoriaId: "asc" }, { ordem: "asc" }]
    })
  ]);

  const equipamentoOptionsAtivas = options
    .filter(
      (option) =>
        option.tipo === TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO && option.ativo
    )
    .map((option) => option.nome);
  const equipamentosCategoria: Array<{
    nome: string;
    categoria: NonNullable<(typeof options)[number]["categoriaEquipamento"]>;
  }> = [];
  for (const option of options) {
    if (
      option.tipo === TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO &&
      option.categoriaEquipamento
    ) {
      equipamentosCategoria.push({
        nome: option.nome,
        categoria: option.categoriaEquipamento
      });
    }
  }
  const regrasCategoriaForm = categoryRules.map((regra) => ({
    categoria: regra.categoria.categoria,
    temperaturaMin: regra.temperaturaMin,
    temperaturaMax: regra.temperaturaMax,
    status: regra.status,
    acaoCorretiva: regra.acaoCorretiva,
    ordem: regra.ordem,
    isActive: regra.isActive
  }));
  const configuracaoDisponivel =
    equipamentoOptionsAtivas.length > 0 && regrasCategoriaForm.length > 0;

  const editId = parsePositiveInt(firstParam(params.editId));
  const deleteId = parsePositiveInt(firstParam(params.deleteId));
  const fotoId = parsePositiveInt(firstParam(params.fotoId));
  const novoRegistroSelecionado = firstParam(params.new) === "1";
  const registroEmEdicao = editId
    ? await prisma.controleTemperaturaEquipamento.findUnique({ where: { id: editId } })
    : null;
  const registroParaExcluir = deleteId
    ? await prisma.controleTemperaturaEquipamento.findUnique({ where: { id: deleteId } })
    : null;
  const fotoRegistroEmEdicao = registroEmEdicao
    ? getImageDataUrl(registroEmEdicao.fotoMimeType, registroEmEdicao.fotoBase64)
    : null;

  const equipamentoFormOptions =
    registroEmEdicao && !equipamentoOptionsAtivas.includes(registroEmEdicao.equipamento)
      ? [registroEmEdicao.equipamento, ...equipamentoOptionsAtivas]
      : equipamentoOptionsAtivas;
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
  if (registroEmEdicao) {
    const periodo = getMonthYear(registroEmEdicao.data);
    periodos.set(periodKey(periodo.mes, periodo.ano), periodo);
  }
  if (registroParaExcluir) {
    const periodo = getMonthYear(registroParaExcluir.data);
    periodos.set(periodKey(periodo.mes, periodo.ano), periodo);
  }
  periodos.set(periodKey(fechamentoMes, fechamentoAno), {
    mes: fechamentoMes,
    ano: fechamentoAno
  });

  const periodosAssinados = periodos.size
    ? await prisma.controleTemperaturaEquipamentoFechamento.findMany({
        where: {
          status: StatusFechamentoTemperaturaEquipamento.ASSINADO,
          OR: Array.from(periodos.values()).map((periodo) => ({
            mes: periodo.mes,
            ano: periodo.ano
          }))
        }
      })
    : [];

  const assinadosSet = new Set(
    periodosAssinados.map((item) => periodKey(item.mes, item.ano))
  );
  const periodoEdicao = registroEmEdicao ? getMonthYear(registroEmEdicao.data) : null;
  const registroEmEdicaoBloqueado = periodoEdicao
    ? assinadosSet.has(periodKey(periodoEdicao.mes, periodoEdicao.ano))
    : false;
  const periodoExclusao = registroParaExcluir ? getMonthYear(registroParaExcluir.data) : null;
  const registroParaExcluirBloqueado = periodoExclusao
    ? assinadosSet.has(periodKey(periodoExclusao.mes, periodoExclusao.ano))
    : false;

  const parametrosRetorno = new URLSearchParams();
  if (filtroData) parametrosRetorno.set("filtroData", filtroData);
  if (filtroMes) parametrosRetorno.set("filtroMes", String(filtroMes));
  if (filtroAno) parametrosRetorno.set("filtroAno", String(filtroAno));
  if (filtroEquipamento) parametrosRetorno.set("filtroEquipamento", filtroEquipamento);
  if (filtroStatus) parametrosRetorno.set("filtroStatus", filtroStatus);
  if (filtroResponsavel) parametrosRetorno.set("filtroResponsavel", filtroResponsavel);
  parametrosRetorno.set("fechamentoMes", String(fechamentoMes));
  parametrosRetorno.set("fechamentoAno", String(fechamentoAno));

  const returnTo = buildPathWithParams(parametrosRetorno);
  const hrefNovoRegistro = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("new", "1");
    return buildPathWithParams(query);
  })();
  const formReturnTo = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    if (registroEmEdicao) {
      query.set("editId", String(registroEmEdicao.id));
    } else {
      query.set("new", "1");
    }
    return buildPathWithParams(query);
  })();
  const hrefCancelarFormulario = buildPathWithParams(parametrosRetorno);
  const mostrarFormulario = novoRegistroSelecionado || Boolean(registroEmEdicao);
  const modalError = feedback && feedbackType === "error" ? feedback : "";
  const dataFormulario =
    registroEmEdicao?.data ?? parseDateInput(todayDateInput) ?? getTodaySystemDate();
  const turnoFormulario =
    registroEmEdicao?.turno ??
    (getCurrentShift(now) === "MANHA"
      ? TurnoTemperaturaEquipamento.MANHA
      : TurnoTemperaturaEquipamento.TARDE);
  const registrosDuplicidadeFormulario = mostrarFormulario
    ? await prisma.controleTemperaturaEquipamento.findMany({
        where: {
          data: dataFormulario,
          turno: turnoFormulario,
          ...(registroEmEdicao ? { id: { not: registroEmEdicao.id } } : {})
        },
        select: {
          id: true,
          equipamento: true
        },
        orderBy: [{ createdAt: "desc" }]
      })
    : [];
  const registrosDuplicidadeForm = registrosDuplicidadeFormulario.map((registro) => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("editId", String(registro.id));

    return {
      id: registro.id,
      equipamento: registro.equipamento,
      href: buildPathWithParams(query)
    };
  });
  const deleteReturnTo = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    if (registroParaExcluir) {
      query.set("deleteId", String(registroParaExcluir.id));
    }
    return buildPathWithParams(query);
  })();

  const rangeFechamento = getMonthDateRange(fechamentoMes, fechamentoAno);
  const [registrosFechamento, fechamentoAtual] = await Promise.all([
    prisma.controleTemperaturaEquipamento.findMany({
      where: { data: { gte: rangeFechamento.start, lte: rangeFechamento.end } },
      orderBy: [{ data: "asc" }, { createdAt: "asc" }]
    }),
    prisma.controleTemperaturaEquipamentoFechamento.findUnique({
      where: { mes_ano: { mes: fechamentoMes, ano: fechamentoAno } }
    })
  ]);

  const fechamentoAssinado =
    fechamentoAtual?.status === StatusFechamentoTemperaturaEquipamento.ASSINADO;
  const reaberturaFormId = `reabertura-form-${fechamentoMes}-${fechamentoAno}`;
  const resumoDiarioFechamento = buildDailyClosingSummaries(
    registrosFechamento,
    equipamentoOptionsAtivas
  );
  const resumoConsolidadoFechamento = resumoDiarioFechamento.reduce(
    (summary, dia) => ({
      total: summary.total + dia.total,
      normais: summary.normais + dia.normais,
      alertas: summary.alertas + dia.alertas,
      criticas: summary.criticas + dia.criticas,
      justificados: summary.justificados + dia.justificados,
      acoesCorretivas: summary.acoesCorretivas + dia.acoesCorretivas,
      fotosAnexadas: summary.fotosAnexadas + dia.fotosAnexadas
    }),
    {
      total: 0,
      normais: 0,
      alertas: 0,
      criticas: 0,
      justificados: 0,
      acoesCorretivas: 0,
      fotosAnexadas: 0
    }
  );
  const diaFechamentoSelecionadoKey = (() => {
    const parsed = parseDateInput(firstParam(params.diaFechamento).trim());
    return parsed ? formatDateInput(parsed) : "";
  })();
  const diaFechamentoSelecionado =
    resumoDiarioFechamento.find((dia) => dia.key === diaFechamentoSelecionadoKey) ?? null;
  const hrefFecharDetalheDia = buildPathWithParams(parametrosRetorno);
  const hrefHistoricoFechamento = `/controle-temperatura-equipamentos/historico?filtroMes=${fechamentoMes}&filtroAno=${fechamentoAno}`;
  const buildHrefDetalheDia = (dia: DailyClosingSummary) => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("diaFechamento", dia.key);
    return buildPathWithParams(query);
  };
  const registroFotoSelecionado = fotoId
    ? [...registros, ...registrosFechamento].find((registro) => registro.id === fotoId) ?? null
    : null;
  const fotoSelecionadaDataUrl = registroFotoSelecionado
    ? getImageDataUrl(registroFotoSelecionado.fotoMimeType, registroFotoSelecionado.fotoBase64)
    : null;
  const hrefFecharFoto = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    if (diaFechamentoSelecionadoKey) {
      query.set("diaFechamento", diaFechamentoSelecionadoKey);
    }
    return buildPathWithParams(query);
  })();
  const buildHrefFoto = (id: number, manterDiaFechamento = false) => {
    const query = new URLSearchParams(parametrosRetorno);
    if (manterDiaFechamento && diaFechamentoSelecionadoKey) {
      query.set("diaFechamento", diaFechamentoSelecionadoKey);
    }
    query.set("fotoId", String(id));
    return buildPathWithParams(query);
  };

  return (
    <div className="space-y-6 dark:text-slate-100">
      <DocumentosModuleHeader
        title="Controle de Temperatura de Equipamentos"
        description="Registro diário de temperatura dos equipamentos"
        modulo={ModuloDocumento.CONTROLE_TEMPERATURA}
        modulePath={MODULE_PATH}
        searchParams={params}
        managementHref={podeGerenciarOpcoes ? "/controle-temperatura-equipamentos/opcoes" : undefined}
        maintenanceHref="/chamados-manutencao?origem=TEMPERATURA"
        actions={
          <>
            {podeVerGestao ? (
              <Link href="/controle-temperatura-equipamentos/historico" className="btn-secondary">
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

      <div className={registroEmEdicao ? "bpma-modal-backdrop" : ""}>
        <section className={registroEmEdicao ? "bpma-modal-panel max-w-3xl" : CARD_CLASS}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {registroEmEdicao ? "Editar Registro" : "Cadastro de Registro"}
            </h2>
            {mostrarFormulario ? (
              <Link href={hrefCancelarFormulario} className="btn-secondary">
                Cancelar
              </Link>
            ) : null}
          </div>

          {registroEmEdicao && modalError ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}

          {!mostrarFormulario ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clique em <strong>Novo Registro</strong> para abrir o formulário. A ação de edição
              abre em modal sobreposto a partir da lista.
            </p>
          ) : !configuracaoDisponivel ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              O módulo ainda não possui equipamentos ou regras de temperatura suficientes para cadastro.
              {podeGerenciarOpcoes ? (
                <>
                  {" "}
                  Use <strong>Gerenciar Opções</strong> para concluir a configuração inicial.
                </>
              ) : (
                " Solicite à gestão a configuração inicial do módulo."
              )}
            </p>
          ) : registroEmEdicao && registroEmEdicaoBloqueado ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Este registro pertence a um mês fechado e não pode ser alterado.
            </p>
          ) : (
            <form
              action={registroEmEdicao ? updateRegistroAction : createRegistroAction}
              className="grid gap-4 md:grid-cols-2"
            >
              <input type="hidden" name="returnTo" value={formReturnTo} />
              {registroEmEdicao ? <input type="hidden" name="id" value={registroEmEdicao.id} /> : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Data do Procedimento
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {registroEmEdicao
                  ? formatDateDisplay(registroEmEdicao.data)
                  : formatDateTimeDisplay(now)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Turno
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {getShiftLabel(turnoFormulario)}
              </p>
            </div>

            <AutomaticCorrectiveActionFields
              equipamentoOptions={equipamentoFormOptions}
              equipamentosCategoria={equipamentosCategoria}
              regrasCategoria={regrasCategoriaForm}
              registrosDuplicidade={registrosDuplicidadeForm}
              defaultEquipamento={registroEmEdicao?.equipamento ?? ""}
              defaultTemperatura={
                registroEmEdicao?.temperaturaAferida !== null &&
                registroEmEdicao?.temperaturaAferida !== undefined
                  ? String(registroEmEdicao.temperaturaAferida).replace(".", ",")
                  : ""
              }
              defaultAcaoCorretiva={registroEmEdicao?.acaoCorretiva ?? ""}
              defaultStatusOperacional={
                registroEmEdicao?.statusOperacionalEquipamento ??
                StatusOperacionalEquipamento.EM_OPERACAO
              }
              inputClassName={INPUT_CLASS}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Responsável
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {responsavelLogado}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preenchido automaticamente pelo usuário logado.
              </p>
            </div>

            <ImageUploadField
              name="fotoDesvio"
              label="Anexar foto da evidência"
              existingImageDataUrl={fotoRegistroEmEdicao}
              existingFileName={registroEmEdicao?.fotoNome ?? null}
              helperText="Selecione uma imagem da galeria ou dos arquivos do dispositivo. Obrigatória em Alerta/Crítico. Formatos: JPG, PNG ou WEBP de até 5 MB."
              requiredStatusFieldName="statusCalculado"
              requiredStatusValues={["ALERTA", "CRITICO"]}
              requiredMessage="Anexe uma foto da evidência para salvar este registro."
              disabledStatusFieldName="statusOperacionalEquipamento"
              disabledStatusValues={[
                StatusOperacionalEquipamento.MANUTENCAO,
                StatusOperacionalEquipamento.INATIVO
              ]}
              disabledMessage="Foto não é necessária quando o equipamento está em manutenção ou inativo."
              inputClassName={INPUT_CLASS}
            />

            <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
              Observação, se necessário
              <textarea
                name="observacaoStatusOperacional"
                rows={3}
                defaultValue={
                  registroEmEdicao?.observacaoStatusOperacional ??
                  registroEmEdicao?.observacoes ??
                  ""
                }
                className={INPUT_CLASS}
              />
            </label>

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">
                {registroEmEdicao ? "Salvar Alterações" : "Salvar Registro"}
              </button>
            </div>
            </form>
          )}
        </section>
      </div>

      <section className={CARD_CLASS}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Registros do Dia
          </h2>
          {configuracaoDisponivel ? (
            <Link href={hrefNovoRegistro} className="btn-primary">
              Novo Registro
            </Link>
          ) : null}
        </div>

        {podeVerGestao ? (
        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 dark:bg-slate-800">
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
            Equipamento
            <input
              type="text"
              name="filtroEquipamento"
              defaultValue={filtroEquipamento}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select
              name="filtroStatus"
              defaultValue={filtroStatus ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">Todos</option>
              <option value={StatusTemperaturaEquipamento.CONFORME}>Normal</option>
              <option value={StatusTemperaturaEquipamento.ALERTA}>Alerta</option>
              <option value={StatusTemperaturaEquipamento.CRITICO}>Crítico</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Responsável
            <input
              type="text"
              name="filtroResponsavel"
              defaultValue={filtroResponsavel}
              className={INPUT_CLASS}
            />
          </label>

          <div className="btn-group md:col-span-6">
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
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Exibindo os registros de temperatura de hoje.
          </p>
        )}

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          A listagem principal mostra os registros da data atual automaticamente.
          {podeVerGestao ? (
            <>
              {" "}
              Use os filtros ou o <strong>Histórico Completo</strong> para outras consultas.
            </>
          ) : null}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Equipamento</th>
                <th className="px-3 py-2">Turno</th>
                <th className="px-3 py-2">Status operacional</th>
                <th className="px-3 py-2">Temperatura</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 min-w-52">Ação Corretiva</th>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2 min-w-44">Observação</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registros.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={11}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => {
                  const periodo = getMonthYear(registro.data);
                  const bloqueado = assinadosSet.has(periodKey(periodo.mes, periodo.ano));
                  const hrefEditar = (() => {
                    const query = new URLSearchParams(parametrosRetorno);
                    query.set("editId", String(registro.id));
                    return buildPathWithParams(query);
                  })();
                  const hasStoredImage = Boolean(registro.fotoMimeType && registro.fotoBase64);
                  const registroEmOperacao = isOperationalRecord(registro);
                  const observacaoRegistro = registroEmOperacao
                    ? registro.observacoes
                    : registro.observacaoStatusOperacional;
                  return (
                    <tr key={registro.id}>
                      <td className="px-3 py-2">{formatDateDisplay(registro.data)}</td>
                      <td className="px-3 py-2">{registro.equipamento}</td>
                      <td className="px-3 py-2">{getShiftLabel(registro.turno)}</td>
                      <td className="px-3 py-2">
                        {getOperationalStatusLabel(registro.statusOperacionalEquipamento)}
                      </td>
                      <td className="px-3 py-2">{formatTemperatureDisplay(registro.temperaturaAferida)}</td>
                      <td className="px-3 py-2">
                        {registroEmOperacao ? (
                          <TemperatureStatusBadge status={registro.status} />
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Não aplicável
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-64 whitespace-normal break-words">
                        {registroEmOperacao ? registro.acaoCorretiva ?? "-" : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {registroEmOperacao && hasStoredImage ? (
                          <Link
                            href={buildHrefFoto(registro.id)}
                            scroll={false}
                            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-slate-200"
                          >
                            Ver foto
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-64 whitespace-normal break-words">
                        {observacaoRegistro?.trim() || "-"}
                      </td>
                      <td className="px-3 py-2">{registro.responsavel}</td>
                      <td className="px-3 py-2">
                        <div className="btn-group">
                          <Link href={hrefEditar} className="btn-action">
                            Editar
                          </Link>
                          {podeExcluirRegistros ? (
                            bloqueado ? (
                              <button type="button" disabled className="btn-danger">
                                Excluir
                              </button>
                            ) : (
                              <Link
                                href={(() => {
                                  const query = new URLSearchParams(parametrosRetorno);
                                  query.set("deleteId", String(registro.id));
                                  return buildPathWithParams(query);
                                })()}
                                className="btn-danger"
                              >
                                Excluir
                              </Link>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {registroParaExcluir ? (
        <ActionModal
          title="Excluir Registro"
          cancelHref={hrefCancelarFormulario}
          description={
            <p>
              Equipamento: <strong>{registroParaExcluir.equipamento}</strong> em{" "}
              {formatDateDisplay(registroParaExcluir.data)}.
            </p>
          }
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          {registroParaExcluirBloqueado ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Este registro pertence a um mês fechado e não pode ser excluído.
            </p>
          ) : (
            <form action={deleteRegistroAction}>
              <input type="hidden" name="id" value={registroParaExcluir.id} />
              <input type="hidden" name="returnTo" value={deleteReturnTo} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Confirme a exclusão deste registro. A permissão também será validada no servidor.
              </p>
              <ModalActions>
                <Link href={hrefCancelarFormulario} className="btn-secondary text-center">
                  Cancelar
                </Link>
                <button type="submit" className="btn-danger">
                  Excluir Registro
                </button>
              </ModalActions>
            </form>
          )}
        </ActionModal>
      ) : null}

      {podeVerGestao && diaFechamentoSelecionado ? (
        <ActionModal
          title={`Detalhes do dia ${formatDateDisplay(diaFechamentoSelecionado.data)}`}
          cancelHref={hrefFecharDetalheDia}
          description={
            <p>
              {diaFechamentoSelecionado.total} aferição(ões) no dia, situação{" "}
              <strong>{getDailyClosingStatusLabel(diaFechamentoSelecionado.situacao)}</strong>.
              {diaFechamentoSelecionado.expectedTotal > 0 ? (
                <>
                  {" "}
                  Esperadas: <strong>{diaFechamentoSelecionado.expectedTotal}</strong>;
                  pendentes: <strong>{diaFechamentoSelecionado.missingTotal}</strong>.
                </>
              ) : null}
            </p>
          }
          maxWidthClassName="max-w-6xl"
        >
          <dl className="grid gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-7">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Total</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.total}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Justificados</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.justificados}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Normais</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.normais}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Alertas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.alertas}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Críticas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.criticas}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Ações corretivas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.acoesCorretivas}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Fotos anexadas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {diaFechamentoSelecionado.fotosAnexadas}
              </dd>
            </div>
          </dl>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2">Equipamento</th>
                  <th className="px-3 py-2">Turno</th>
                  <th className="px-3 py-2">Status operacional</th>
                  <th className="px-3 py-2">Temperatura</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 min-w-52">Ação corretiva</th>
                  <th className="px-3 py-2">Foto/evidência</th>
                  <th className="px-3 py-2 min-w-44">Observação</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Aferição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {diaFechamentoSelecionado.registros.map((registro) => {
                  const hasStoredImage = Boolean(registro.fotoMimeType && registro.fotoBase64);
                  const registroEmOperacao = isOperationalRecord(registro);
                  const observacaoRegistro = registroEmOperacao
                    ? registro.observacoes
                    : registro.observacaoStatusOperacional;

                  return (
                    <tr key={registro.id}>
                      <td className="px-3 py-2">{registro.equipamento}</td>
                      <td className="px-3 py-2">{getShiftLabel(registro.turno)}</td>
                      <td className="px-3 py-2">
                        {getOperationalStatusLabel(registro.statusOperacionalEquipamento)}
                      </td>
                      <td className="px-3 py-2">
                        {formatTemperatureDisplay(registro.temperaturaAferida)}
                      </td>
                      <td className="px-3 py-2">
                        {registroEmOperacao ? (
                          <TemperatureStatusBadge status={registro.status} />
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Não aplicável
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-64 whitespace-normal break-words">
                        {registroEmOperacao ? registro.acaoCorretiva ?? "-" : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {registroEmOperacao && hasStoredImage ? (
                          <Link
                            href={buildHrefFoto(registro.id, true)}
                            scroll={false}
                            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-slate-200"
                          >
                            Ver foto
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-64 whitespace-normal break-words">
                        {observacaoRegistro?.trim() || "-"}
                      </td>
                      <td className="px-3 py-2">{registro.responsavel}</td>
                      <td className="px-3 py-2">{formatDateTimeDisplay(registro.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionModal>
      ) : null}

      {fotoId ? (
        <ActionModal
          title="Foto da evidência"
          cancelHref={hrefFecharFoto}
          maxWidthClassName="max-w-4xl"
          description={
            registroFotoSelecionado ? (
              <p>
                {registroFotoSelecionado.equipamento} em{" "}
                {formatDateDisplay(registroFotoSelecionado.data)}.
              </p>
            ) : null
          }
        >
          {fotoSelecionadaDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoSelecionadaDataUrl}
              alt={`Foto do registro ${registroFotoSelecionado?.id ?? fotoId}`}
              className="max-h-[75vh] w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
            />
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Não foi possível carregar a imagem anexada.
            </p>
          )}
        </ActionModal>
      ) : null}

      {podeVerGestao ? (
      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Fechamento Mensal</h2>

        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4 dark:bg-slate-800">
          <input type="hidden" name="filtroData" value={filtroData} />
          <input type="hidden" name="filtroMes" value={filtroMes ? String(filtroMes) : ""} />
          <input type="hidden" name="filtroAno" value={filtroAno ? String(filtroAno) : ""} />
          <input type="hidden" name="filtroEquipamento" value={filtroEquipamento} />
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
            Período: {String(fechamentoMes).padStart(2, "0")}/{fechamentoAno} - {fechamentoAssinado ? "Assinado" : "Aberto"}
          </p>

          <dl className="mb-4 grid gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-7">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Dias com aferição</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoDiarioFechamento.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Total de aferições</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.total}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Justificados</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.justificados}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Normais</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.normais}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Alertas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.alertas}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Críticas</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.criticas}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Ações/Fotos</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">
                {resumoConsolidadoFechamento.acoesCorretivas}/{resumoConsolidadoFechamento.fotosAnexadas}
              </dd>
            </div>
          </dl>

          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Justificados</th>
                  <th className="px-3 py-2">Normais</th>
                  <th className="px-3 py-2">Alertas</th>
                  <th className="px-3 py-2">Críticas</th>
                  <th className="px-3 py-2">Ações corretivas</th>
                  <th className="px-3 py-2">Fotos anexadas</th>
                  <th className="px-3 py-2">Responsáveis</th>
                  <th className="px-3 py-2">Situação do dia</th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resumoDiarioFechamento.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400" colSpan={11}>
                      Nenhum registro no período selecionado.
                    </td>
                  </tr>
                ) : (
                  resumoDiarioFechamento.map((dia) => (
                    <tr key={dia.key}>
                      <td className="px-3 py-2">{formatDateDisplay(dia.data)}</td>
                      <td className="px-3 py-2">{dia.total}</td>
                      <td className="px-3 py-2">{dia.justificados}</td>
                      <td className="px-3 py-2">{dia.normais}</td>
                      <td className="px-3 py-2">{dia.alertas}</td>
                      <td className="px-3 py-2">{dia.criticas}</td>
                      <td className="px-3 py-2">{dia.acoesCorretivas}</td>
                      <td className="px-3 py-2">{dia.fotosAnexadas}</td>
                      <td className="px-3 py-2">{dia.responsaveisResumo}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getDailyClosingStatusClassName(dia.situacao)}`}>
                          {getDailyClosingStatusLabel(dia.situacao)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={buildHrefDetalheDia(dia)} scroll={false} className="btn-secondary">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Link href={hrefHistoricoFechamento} className="btn-secondary">
              Ver Histórico Completo
            </Link>
          </div>

          {fechamentoAssinado ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <p>
                Mês assinado por <strong>{fechamentoAtual?.responsavelTecnico}</strong>.
              </p>
              <p>
                Data da assinatura: <strong>{fechamentoAtual ? formatDateTimeDisplay(fechamentoAtual.dataAssinatura) : "-"}</strong>
              </p>
              <form id={reaberturaFormId} action={reopenMonthAction} className="mt-4">
                <input type="hidden" name="mes" value={String(fechamentoMes)} />
                <input type="hidden" name="ano" value={String(fechamentoAno)} />
                <input type="hidden" name="returnTo" value={returnTo} />
              </form>
              <ReopenMonthModal mes={fechamentoMes} ano={fechamentoAno} formId={reaberturaFormId} />
            </div>
          ) : (
            <form action={closeMonthAction} className="grid gap-3 md:grid-cols-2">
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
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
