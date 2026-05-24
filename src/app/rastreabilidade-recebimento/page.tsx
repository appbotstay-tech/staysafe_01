import {
  ModuloDocumento,
  Prisma,
  StatusFechamentoRastreabilidadeRecebimento,
  StatusNotaRecebimento,
  StatusRecebimento
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

import {
  closeMonthAction,
  deleteNoteAction,
  reopenMonthAction
} from "./actions";
import { DeleteNoteModal } from "./delete-note-modal";
import { RECEBIMENTO_ORIENTACOES } from "./options";
import { ReopenMonthModal } from "./reopen-month-modal";
import { XmlImportForm } from "./xml-import-form";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  getCurrentSystemDateTime,
  getMonthDateRange,
  getMonthYear,
  parseDateInput,
  parsePositiveInt
} from "./utils";

const MODULE_PATH = "/rastreabilidade-recebimento";
const ITEM_SEARCH_ANCHOR = "busca-item-recebido";
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
const PENDING_NOTE_STATUSES = [
  StatusNotaRecebimento.PENDENTE,
  StatusNotaRecebimento.IMPORTADA,
  StatusNotaRecebimento.EM_CONFERENCIA
];

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPathWithParams(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${MODULE_PATH}?${query}` : MODULE_PATH;
}

function getNotaStatusLabel(status: StatusNotaRecebimento): string {
  if (status === StatusNotaRecebimento.FINALIZADA) {
    return "Finalizada";
  }

  if (status === StatusNotaRecebimento.IMPORTADA) {
    return "Importada";
  }

  if (status === StatusNotaRecebimento.EM_CONFERENCIA) {
    return "Em Conferência";
  }

  return "Pendente";
}

function getNotaStatusClass(status: StatusNotaRecebimento): string {
  if (status === StatusNotaRecebimento.FINALIZADA) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (status === StatusNotaRecebimento.IMPORTADA) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
}

function getItemStatusLabel(status: StatusRecebimento): string {
  if (status === StatusRecebimento.CONFORME) {
    return "Conferido";
  }

  if (status === StatusRecebimento.NAO_CONFORME) {
    return "Não Conforme";
  }

  return "Pendente";
}

function canImportXml(role: string | null): boolean {
  return role === "DEV" || role === "GERENTE";
}

function parseItemStatusFilter(value: string): StatusRecebimento | null {
  if (value === StatusRecebimento.PENDENTE) return StatusRecebimento.PENDENTE;
  if (value === StatusRecebimento.CONFORME) return StatusRecebimento.CONFORME;
  if (value === StatusRecebimento.NAO_CONFORME) return StatusRecebimento.NAO_CONFORME;
  return null;
}

function parsePendingStatusFilter(value: string): StatusNotaRecebimento | null {
  if (value === StatusNotaRecebimento.PENDENTE) return StatusNotaRecebimento.PENDENTE;
  if (value === StatusNotaRecebimento.IMPORTADA) return StatusNotaRecebimento.IMPORTADA;
  if (value === StatusNotaRecebimento.EM_CONFERENCIA) {
    return StatusNotaRecebimento.EM_CONFERENCIA;
  }

  return null;
}

export default async function RastreabilidadeRecebimentoPage({ searchParams }: PageProps) {
  const authUser = await getCurrentUser();
  const responsavelLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const isColaborador = authUser?.perfil === "COLABORADOR";
  const podeVerGestao = authUser ? canViewManagementSections(authUser.perfil) : false;
  const permitirImportacao = canImportXml(authUser?.perfil ?? null);
  const podeGerenciarOpcoes = authUser ? canManageModuleOptions(authUser.perfil) : false;
  const podeExcluirNotas = permitirImportacao;
  const podeFechar = authUser ? canCloseMonth(authUser.perfil) : false;
  const podeReabrir = authUser ? canReopenMonth(authUser.perfil) : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const importarXmlSelecionado = firstParam(params.importXml) === "1";
  const modalError = feedback && feedbackType === "error" ? feedback : "";

  const now = getCurrentSystemDateTime();

  const filtroDataInicial = firstParam(params.filtroDataInicial).trim();
  const filtroDataFinal = firstParam(params.filtroDataFinal).trim();
  const filtroFornecedor = firstParam(params.filtroFornecedor).trim();
  const filtroNotaFiscal = firstParam(params.filtroNotaFiscal).trim();
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const filtroStatus = parsePendingStatusFilter(firstParam(params.filtroStatus).trim());
  const buscaItemRecebido = firstParam(params.buscaItemRecebido).trim();
  const filtroItemProduto = firstParam(params.filtroItemProduto).trim();
  const filtroItemLote = firstParam(params.filtroItemLote).trim();
  const filtroDataFabricacao =
    firstParam(params.filtroDataFabricacao).trim() ||
    firstParam(params.filtroValidadeInicial).trim();
  const filtroValidadeFinal = firstParam(params.filtroValidadeFinal).trim();
  const filtroItemStatus = parseItemStatusFilter(firstParam(params.filtroItemStatus).trim());

  const fechamentoMesRaw = parsePositiveInt(firstParam(params.fechamentoMes));
  const fechamentoAnoRaw = parsePositiveInt(firstParam(params.fechamentoAno));
  const periodoAtual = getMonthYear(now);
  const fechamentoMes =
    fechamentoMesRaw && fechamentoMesRaw >= 1 && fechamentoMesRaw <= 12
      ? fechamentoMesRaw
      : periodoAtual.mes;
  const fechamentoAno = fechamentoAnoRaw ?? periodoAtual.ano;

  const whereNotasPendentes: Prisma.RastreabilidadeRecebimentoNotaWhereInput = {
    statusNota: filtroStatus ?? { in: PENDING_NOTE_STATUSES }
  };

  const dataInicialFiltro = parseDateInput(filtroDataInicial);
  const dataFinalFiltro = parseDateInput(filtroDataFinal);
  const dataRecebimentoInvalida =
    dataInicialFiltro && dataFinalFiltro && dataInicialFiltro.getTime() > dataFinalFiltro.getTime();

  if (!dataRecebimentoInvalida && dataInicialFiltro && dataFinalFiltro) {
    whereNotasPendentes.data = { gte: dataInicialFiltro, lte: dataFinalFiltro };
  } else if (!dataRecebimentoInvalida && dataInicialFiltro) {
    whereNotasPendentes.data = { gte: dataInicialFiltro };
  } else if (!dataRecebimentoInvalida && dataFinalFiltro) {
    whereNotasPendentes.data = { lte: dataFinalFiltro };
  } else if (dataRecebimentoInvalida) {
    whereNotasPendentes.id = -1;
  }

  if (filtroFornecedor) {
    whereNotasPendentes.fornecedor = { contains: filtroFornecedor, mode: "insensitive" };
  }

  if (filtroNotaFiscal) {
    whereNotasPendentes.notaFiscal = { contains: filtroNotaFiscal, mode: "insensitive" };
  }

  if (filtroResponsavel) {
    whereNotasPendentes.responsavelGeral = {
      contains: filtroResponsavel,
      mode: "insensitive"
    };
  }

  const rangeFechamento = getMonthDateRange(fechamentoMes, fechamentoAno);
  const [notasPendentesConferencia, notasFechamento, itensFechamento, fechamentoAtual] =
    await Promise.all([
      prisma.rastreabilidadeRecebimentoNota.findMany({
        where: whereNotasPendentes,
        include: {
          _count: {
            select: {
              itens: true
            }
          }
        },
        orderBy: [{ data: "asc" }, { createdAt: "asc" }]
      }),
      prisma.rastreabilidadeRecebimentoNota.findMany({
        where: {
          data: {
            gte: rangeFechamento.start,
            lte: rangeFechamento.end
          }
        },
        select: {
          statusNota: true,
          _count: {
            select: {
              itens: true
            }
          }
        }
      }),
      prisma.rastreabilidadeRecebimentoRegistro.findMany({
        where: {
          data: {
            gte: rangeFechamento.start,
            lte: rangeFechamento.end
          }
        },
        select: {
          statusGeral: true,
          acaoCorretiva: true
        }
      }),
      prisma.rastreabilidadeRecebimentoFechamento.findUnique({
        where: {
          mes_ano: {
            mes: fechamentoMes,
            ano: fechamentoAno
          }
        }
      })
    ]);

  const itemSearchDate = parseDateInput(buscaItemRecebido);
  const dataFabricacaoFiltro = parseDateInput(filtroDataFabricacao);
  const validadeFinalFiltro = parseDateInput(filtroValidadeFinal);
  const datasItemInvalidas =
    dataFabricacaoFiltro &&
    validadeFinalFiltro &&
    dataFabricacaoFiltro.getTime() > validadeFinalFiltro.getTime();
  const itemFilterError = dataRecebimentoInvalida
    ? "A data inicial de recebimento não pode ser maior que a data final."
    : datasItemInvalidas
      ? "A Data de Fabricação não pode ser maior que a Validade Final."
      : "";
  const deveBuscarItens = Boolean(
    buscaItemRecebido ||
      filtroItemProduto ||
      filtroItemLote ||
      filtroDataFabricacao ||
      filtroValidadeFinal ||
      filtroDataInicial ||
      filtroDataFinal ||
      filtroFornecedor ||
      filtroNotaFiscal ||
      filtroItemStatus
  );
  const whereItensRecebidos: Prisma.RastreabilidadeRecebimentoRegistroWhereInput = {};
  const itemAndFilters: Prisma.RastreabilidadeRecebimentoRegistroWhereInput[] = [];

  if (buscaItemRecebido) {
    const itemSearchOr: Prisma.RastreabilidadeRecebimentoRegistroWhereInput[] = [
      { produto: { contains: buscaItemRecebido, mode: "insensitive" } },
      { lote: { contains: buscaItemRecebido, mode: "insensitive" } },
      { notaFiscal: { contains: buscaItemRecebido, mode: "insensitive" } },
      { fornecedor: { contains: buscaItemRecebido, mode: "insensitive" } }
    ];
    if (itemSearchDate) {
      itemSearchOr.push(
        { data: itemSearchDate },
        { dataFabricacao: itemSearchDate },
        { dataValidade: itemSearchDate }
      );
    }

    itemAndFilters.push({
      OR: itemSearchOr
    });
  }
  if (dataInicialFiltro && dataFinalFiltro) {
    itemAndFilters.push({ data: { gte: dataInicialFiltro, lte: dataFinalFiltro } });
  } else if (dataInicialFiltro) {
    itemAndFilters.push({ data: { gte: dataInicialFiltro } });
  } else if (dataFinalFiltro) {
    itemAndFilters.push({ data: { lte: dataFinalFiltro } });
  }
  if (filtroItemProduto) {
    itemAndFilters.push({ produto: { contains: filtroItemProduto, mode: "insensitive" } });
  }
  if (filtroItemLote) {
    itemAndFilters.push({ lote: { contains: filtroItemLote, mode: "insensitive" } });
  }
  if (filtroFornecedor) {
    itemAndFilters.push({ fornecedor: { contains: filtroFornecedor, mode: "insensitive" } });
  }
  if (filtroNotaFiscal) {
    itemAndFilters.push({ notaFiscal: { contains: filtroNotaFiscal, mode: "insensitive" } });
  }
  if (dataFabricacaoFiltro) {
    itemAndFilters.push({ dataFabricacao: dataFabricacaoFiltro });
  }
  if (validadeFinalFiltro) {
    itemAndFilters.push({ dataValidade: { lte: validadeFinalFiltro } });
  }
  if (filtroItemStatus) {
    itemAndFilters.push({ statusGeral: filtroItemStatus });
  }
  if (itemAndFilters.length > 0) {
    whereItensRecebidos.AND = itemAndFilters;
  }

  const itensRecebidosEncontrados = deveBuscarItens && !itemFilterError
    ? await prisma.rastreabilidadeRecebimentoRegistro.findMany({
        where: whereItensRecebidos,
        include: {
          nota: {
            select: {
              id: true,
              statusNota: true,
              fornecedor: true,
              notaFiscal: true,
              data: true
            }
          }
        },
        orderBy: [{ data: "desc" }, { produto: "asc" }],
        take: 50
      })
    : [];

  const fechamentoAssinado =
    fechamentoAtual?.status === StatusFechamentoRastreabilidadeRecebimento.ASSINADO;
  const totalNotasFechamento = notasFechamento.length;
  const totalNotasFinalizadas = notasFechamento.filter(
    (nota) => nota.statusNota === StatusNotaRecebimento.FINALIZADA
  ).length;
  const totalNotasPendentesFechamento = totalNotasFechamento - totalNotasFinalizadas;
  const totalItensFechamento = notasFechamento.reduce(
    (total, nota) => total + nota._count.itens,
    0
  );
  const totalItensNaoConformes = itensFechamento.filter(
    (item) => item.statusGeral === StatusRecebimento.NAO_CONFORME
  ).length;
  const totalAcoesCorretivas = itensFechamento.filter(
    (item) => item.acaoCorretiva?.trim()
  ).length;
  const historicoPeriodoHref = `/rastreabilidade-recebimento/historico?filtroMes=${fechamentoMes}&filtroAno=${fechamentoAno}`;
  const fechamentoResumoCards = [
    { label: "Notas importadas", value: totalNotasFechamento },
    { label: "Notas finalizadas", value: totalNotasFinalizadas },
    { label: "Notas pendentes", value: totalNotasPendentesFechamento },
    { label: "Itens recebidos", value: totalItensFechamento },
    { label: "Não conformidades", value: totalItensNaoConformes },
    { label: "Ações corretivas", value: totalAcoesCorretivas }
  ];

  const paramsRetorno = new URLSearchParams();
  if (filtroDataInicial) paramsRetorno.set("filtroDataInicial", filtroDataInicial);
  if (filtroDataFinal) paramsRetorno.set("filtroDataFinal", filtroDataFinal);
  if (filtroFornecedor) paramsRetorno.set("filtroFornecedor", filtroFornecedor);
  if (filtroNotaFiscal) paramsRetorno.set("filtroNotaFiscal", filtroNotaFiscal);
  if (filtroResponsavel) paramsRetorno.set("filtroResponsavel", filtroResponsavel);
  if (filtroStatus) paramsRetorno.set("filtroStatus", filtroStatus);
  if (buscaItemRecebido) paramsRetorno.set("buscaItemRecebido", buscaItemRecebido);
  if (filtroItemProduto) paramsRetorno.set("filtroItemProduto", filtroItemProduto);
  if (filtroItemLote) paramsRetorno.set("filtroItemLote", filtroItemLote);
  if (filtroDataFabricacao) paramsRetorno.set("filtroDataFabricacao", filtroDataFabricacao);
  if (filtroValidadeFinal) paramsRetorno.set("filtroValidadeFinal", filtroValidadeFinal);
  if (filtroItemStatus) paramsRetorno.set("filtroItemStatus", filtroItemStatus);
  paramsRetorno.set("fechamentoMes", String(fechamentoMes));
  paramsRetorno.set("fechamentoAno", String(fechamentoAno));

  const returnTo = buildPathWithParams(paramsRetorno);
  const importXmlHref = (() => {
    const query = new URLSearchParams(paramsRetorno);
    query.set("importXml", "1");
    return buildPathWithParams(query);
  })();
  const limparFiltrosHref = buildPathWithParams(
    new URLSearchParams({
      fechamentoMes: String(fechamentoMes),
      fechamentoAno: String(fechamentoAno)
    })
  );
  const limparBuscaItensHref = `${limparFiltrosHref}#${ITEM_SEARCH_ANCHOR}`;
  const reaberturaFormId = `reabertura-form-${fechamentoMes}-${fechamentoAno}`;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <DocumentosModuleHeader
        title="Rastreabilidade de Recebimento de Alimentos Perecíveis e Não Perecíveis"
        description="Registro diário do recebimento de mercadorias"
        modulo={ModuloDocumento.RASTREABILIDADE_RECEBIMENTO}
        modulePath={MODULE_PATH}
        searchParams={params}
        managementHref={podeGerenciarOpcoes ? "/rastreabilidade-recebimento/opcoes" : undefined}
        maintenanceHref="/chamados-manutencao?origem=RECEBIMENTO"
        actions={
          <>
            {podeVerGestao ? (
              <Link href="/rastreabilidade-recebimento/historico" className="btn-secondary">
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

      {podeVerGestao ? (
        <section className={CARD_CLASS}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Ações Principais
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Importe o XML da nota fiscal (ADM) e faça a conferência operacional na nota.
              </p>
            </div>
            <Link href="/rastreabilidade-recebimento/nota/nova" className="btn-primary">
              Novo Recebimento Manual
            </Link>
          </div>

          {permitirImportacao ? (
            <div className="btn-group rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <Link href={importXmlHref} className="btn-secondary">
                Importar XML
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              A importação de XML está disponível para DEV e GERENTE.
            </div>
          )}
        </section>
      ) : null}

      {permitirImportacao && importarXmlSelecionado ? (
        <ActionModal
          title="Importar XML"
          cancelHref={returnTo}
          maxWidthClassName="max-w-2xl"
          description="Importe uma nota fiscal sem sair da listagem de recebimentos."
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          <XmlImportForm returnTo={importXmlHref} cancelHref={returnTo} />
        </ActionModal>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Notas Pendentes de Conferência
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Exibindo notas pendentes de conferência, independentemente da data de importação.
        </p>

        {isColaborador ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Exibindo notas aguardando conferência operacional.
          </p>
        ) : (
          <form
            method="get"
            className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 dark:bg-slate-800"
          >
            <input type="hidden" name="fechamentoMes" value={String(fechamentoMes)} />
            <input type="hidden" name="fechamentoAno" value={String(fechamentoAno)} />

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Data Inicial
              <input
                type="date"
                name="filtroDataInicial"
                defaultValue={filtroDataInicial}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Data Final
              <input
                type="date"
                name="filtroDataFinal"
                defaultValue={filtroDataFinal}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Fornecedor
              <input
                type="text"
                name="filtroFornecedor"
                defaultValue={filtroFornecedor}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Número da Nota Fiscal
              <input
                type="text"
                name="filtroNotaFiscal"
                defaultValue={filtroNotaFiscal}
                className={INPUT_CLASS}
              />
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
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select name="filtroStatus" defaultValue={filtroStatus ?? ""} className={INPUT_CLASS}>
                <option value="">Todos pendentes</option>
                <option value={StatusNotaRecebimento.PENDENTE}>Pendente</option>
                <option value={StatusNotaRecebimento.IMPORTADA}>Importada</option>
                <option value={StatusNotaRecebimento.EM_CONFERENCIA}>Em Conferência</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-2 md:col-span-6">
              <button type="submit" className="btn-primary">
                Aplicar Filtros
              </button>
              <Link href={limparFiltrosHref} className="btn-secondary">
                Limpar
              </Link>
            </div>
          </form>
        )}

        {dataRecebimentoInvalida ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            A data inicial de recebimento não pode ser maior que a data final.
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Número da Nota</th>
                <th className="px-3 py-2">Quantidade de Itens</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {notasPendentesConferencia.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Não há notas pendentes de conferência.
                  </td>
                </tr>
              ) : (
                notasPendentesConferencia.map((nota) => (
                  <tr key={nota.id}>
                    <td className="px-3 py-2">{formatDateDisplay(nota.data)}</td>
                    <td className="px-3 py-2">{nota.fornecedor}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/rastreabilidade-recebimento/nota/${nota.id}`}
                        className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                      >
                        {nota.notaFiscal}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{nota._count.itens}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getNotaStatusClass(
                          nota.statusNota
                        )}`}
                      >
                        {getNotaStatusLabel(nota.statusNota)}
                      </span>
                    </td>
                    <td className="px-3 py-2">{nota.responsavelGeral ?? "-"}</td>
                    <td className="px-3 py-2">
                      <div className="btn-group">
                        <Link
                          href={`/rastreabilidade-recebimento/nota/${nota.id}`}
                          className="btn-action"
                        >
                          Conferir Nota
                        </Link>
                        {podeExcluirNotas ? (
                          <DeleteNoteModal formId={`delete-note-day-${nota.id}`} />
                        ) : null}
                      </div>
                      {podeExcluirNotas ? (
                        <form
                          id={`delete-note-day-${nota.id}`}
                          action={deleteNoteAction}
                          className="hidden"
                        >
                          <input type="hidden" name="notaId" value={String(nota.id)} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id={ITEM_SEARCH_ANCHOR} className={`${CARD_CLASS} scroll-mt-6`}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Buscar item recebido
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Pesquise por produto, lote, data de fabricação, validade, fornecedor ou número da nota.
        </p>

        <form
          method="get"
          action={`${MODULE_PATH}#${ITEM_SEARCH_ANCHOR}`}
          className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-7 dark:bg-slate-800"
        >
          <input type="hidden" name="fechamentoMes" value={String(fechamentoMes)} />
          <input type="hidden" name="fechamentoAno" value={String(fechamentoAno)} />
          <input type="hidden" name="filtroDataInicial" value={filtroDataInicial} />
          <input type="hidden" name="filtroDataFinal" value={filtroDataFinal} />
          <input type="hidden" name="filtroFornecedor" value={filtroFornecedor} />
          <input type="hidden" name="filtroNotaFiscal" value={filtroNotaFiscal} />
          <input type="hidden" name="filtroResponsavel" value={filtroResponsavel} />
          <input type="hidden" name="filtroStatus" value={filtroStatus ?? ""} />

          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Busca única
            <input
              type="text"
              name="buscaItemRecebido"
              defaultValue={buscaItemRecebido}
              placeholder="Produto, lote, validade, nota ou fornecedor"
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Produto / item
            <input type="text" name="filtroItemProduto" defaultValue={filtroItemProduto} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Lote
            <input type="text" name="filtroItemLote" defaultValue={filtroItemLote} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data de Fabricação
            <input type="date" name="filtroDataFabricacao" defaultValue={filtroDataFabricacao} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade final
            <input type="date" name="filtroValidadeFinal" defaultValue={filtroValidadeFinal} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="filtroItemStatus" defaultValue={filtroItemStatus ?? ""} className={INPUT_CLASS}>
              <option value="">Todos</option>
              <option value={StatusRecebimento.PENDENTE}>Pendente</option>
              <option value={StatusRecebimento.CONFORME}>Conferido</option>
              <option value={StatusRecebimento.NAO_CONFORME}>Não Conforme</option>
            </select>
          </label>

          <div className="btn-group md:col-span-7">
            <button type="submit" className="btn-primary">
              Buscar
            </button>
            <Link href={limparBuscaItensHref} className="btn-secondary">
              Limpar
            </Link>
          </div>
        </form>

        {itemFilterError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {itemFilterError}
          </p>
        ) : !deveBuscarItens ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Informe ao menos um termo ou filtro para buscar itens dentro das notas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Fornecedor</th>
                  <th className="px-3 py-2">Nota</th>
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Data de fabricação</th>
                  <th className="px-3 py-2">Validade</th>
                  <th className="px-3 py-2">Recebimento</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itensRecebidosEncontrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                      Nenhum item encontrado para os filtros informados.
                    </td>
                  </tr>
                ) : (
                  itensRecebidosEncontrados.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.produto}</td>
                      <td className="px-3 py-2">{item.nota?.fornecedor ?? item.fornecedor}</td>
                      <td className="px-3 py-2">{item.nota?.notaFiscal ?? item.notaFiscal}</td>
                      <td className="px-3 py-2">{item.lote || "-"}</td>
                      <td className="px-3 py-2">
                        {item.dataFabricacao ? formatDateDisplay(item.dataFabricacao) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {item.validadeNaoAplicavel
                          ? "Sem validade"
                          : item.dataValidade
                            ? formatDateDisplay(item.dataValidade)
                            : "-"}
                      </td>
                      <td className="px-3 py-2">{formatDateDisplay(item.nota?.data ?? item.data)}</td>
                      <td className="px-3 py-2">{getItemStatusLabel(item.statusGeral)}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={item.notaId ? `/rastreabilidade-recebimento/nota/${item.notaId}` : MODULE_PATH}
                          className="btn-action"
                        >
                          Abrir nota
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {itensRecebidosEncontrados.length >= 50 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Exibindo os 50 resultados mais recentes. Refine os filtros para auditorias maiores.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {podeVerGestao ? (
      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Fechamento Mensal
        </h2>

        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4 dark:bg-slate-800">
          <input type="hidden" name="filtroDataInicial" value={filtroDataInicial} />
          <input type="hidden" name="filtroDataFinal" value={filtroDataFinal} />
          <input type="hidden" name="filtroFornecedor" value={filtroFornecedor} />
          <input type="hidden" name="filtroNotaFiscal" value={filtroNotaFiscal} />
          <input type="hidden" name="filtroResponsavel" value={filtroResponsavel} />
          <input type="hidden" name="filtroStatus" value={filtroStatus ?? ""} />

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Período: {String(fechamentoMes).padStart(2, "0")}/{fechamentoAno}
              </p>
              <span
                className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                  fechamentoAssinado
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                }`}
              >
                {fechamentoAssinado ? "Fechado" : "Aberto"}
              </span>
            </div>
            <Link href={historicoPeriodoHref} className="btn-secondary">
              Ver Histórico Completo
            </Link>
          </div>

          <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fechamentoResumoCards.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {totalNotasPendentesFechamento > 0 ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <p>
                Existem {totalNotasPendentesFechamento} notas pendentes de finalização neste
                período.
              </p>
              <p className="mt-1">
                Acesse o Histórico Completo para revisar antes de fechar.
              </p>
              <Link href={historicoPeriodoHref} className="btn-secondary mt-3">
                Ver notas no histórico
              </Link>
            </div>
          ) : totalNotasFechamento === 0 ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Nenhuma nota foi importada no período selecionado.
            </div>
          ) : null}

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
                  <form id={reaberturaFormId} action={reopenMonthAction} className="mt-4">
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
          ) : podeFechar && totalNotasFechamento > 0 && totalNotasPendentesFechamento === 0 ? (
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
          ) : !podeFechar ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Seu perfil não possui permissão para assinar o fechamento mensal.
            </p>
          ) : null}
        </div>
      </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Critérios de Conferência</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {RECEBIMENTO_ORIENTACOES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
