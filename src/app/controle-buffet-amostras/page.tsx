import {
  ModuloDocumento,
  StatusFechamentoBuffetAmostra,
  StatusItemBuffetAmostra
} from "@prisma/client";
import Link from "next/link";

import { SignatureContextCard } from "@/components/auth/signature-context-card";
import { DocumentosModuleHeader } from "@/components/documentos/documentos-module-header";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  canCloseMonth,
  canManageModuleOptions,
  canReopenMonth,
  canViewManagementSections,
  getRoleLabel
} from "@/lib/rbac";

import { closeMonthAction, reopenMonthAction } from "./actions";
import { ReopenMonthModal } from "./reopen-month-modal";
import {
  buildBuffetServiceHistoryGroups,
  buildBuffetServiceHistoryTotals
} from "./service-history";
import { BuffetServiceHistoryList } from "./service-history-list";
import { SporadicServiceModal } from "./sporadic-service-modal";
import { ServiceStatusBadge } from "./status-badges";
import {
  calcularStatusServico,
  formatDateDisplay,
  formatDateInput,
  formatDateTimeDisplay,
  getCurrentSystemDateTime,
  getServicoPeriodoLabel,
  getTipoServicoLabel,
  getMonthDateRange,
  getMonthYear,
  getTodaySystemDate,
  isServicoDisponivelNaData,
  parsePositiveInt
} from "./utils";

const MODULE_PATH = "/controle-buffet-amostras";
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

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPathWithParams(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${MODULE_PATH}?${query}` : MODULE_PATH;
}

export default async function ControleBuffetAmostrasPage({ searchParams }: PageProps) {
  const authUser = await getCurrentUser();
  const responsavelLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const podeFechar = authUser ? canCloseMonth(authUser.perfil) : false;
  const podeReabrir = authUser ? canReopenMonth(authUser.perfil) : false;
  const podeGerenciarOpcoes = authUser ? canManageModuleOptions(authUser.perfil) : false;
  const podeVerGestao = authUser ? canViewManagementSections(authUser.perfil) : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  const now = getCurrentSystemDateTime();
  const today = getTodaySystemDate();
  const currentPeriod = getMonthYear(today);
  const todayInput = formatDateInput(today);

  const fechamentoMesRaw = parsePositiveInt(firstParam(params.fechamentoMes));
  const fechamentoAnoRaw = parsePositiveInt(firstParam(params.fechamentoAno));
  const fechamentoMes =
    fechamentoMesRaw && fechamentoMesRaw >= 1 && fechamentoMesRaw <= 12
      ? fechamentoMesRaw
      : currentPeriod.mes;
  const fechamentoAno = fechamentoAnoRaw ?? currentPeriod.ano;

  const [servicos, registrosDia, fechamentoAtual, fechamentoDiaAtual] = await Promise.all([
    prisma.controleBuffetAmostraServico.findMany({
      where: { ativo: true },
      include: {
        itens: {
          where: {
            item: { ativo: true }
          },
          include: {
            item: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.controleBuffetAmostraRegistro.findMany({
      where: { data: today },
      select: {
        id: true,
        servicoId: true,
        itemId: true,
        itemExtra: true,
        status: true
      }
    }),
    prisma.controleBuffetAmostraFechamento.findUnique({
      where: { mes_ano: { mes: fechamentoMes, ano: fechamentoAno } }
    }),
    prisma.controleBuffetAmostraFechamento.findUnique({
      where: { mes_ano: { mes: currentPeriod.mes, ano: currentPeriod.ano } }
    })
  ]);

  const registrosPorServico = new Map<number, typeof registrosDia>();
  for (const registro of registrosDia) {
    const current = registrosPorServico.get(registro.servicoId) ?? [];
    current.push(registro);
    registrosPorServico.set(registro.servicoId, current);
  }

  const servicosDoDia = servicos.filter((servico) =>
    isServicoDisponivelNaData(servico, today)
  ).map((servico) => {
    const registrosServico = registrosPorServico.get(servico.id) ?? [];
    const itensAtivos = servico.itens.map((vinculo) => vinculo.item.id);
    const registrosItensAtivos = registrosServico.filter(
      (registro) =>
        registro.itemExtra ||
        (registro.itemId !== null && itensAtivos.includes(registro.itemId))
    );
    const quantidadeItens =
      itensAtivos.length + registrosServico.filter((registro) => registro.itemExtra).length;

    const itensAssinados = registrosItensAtivos.filter(
      (registro) => registro.status === StatusItemBuffetAmostra.ASSINADO
    ).length;
    const itensNaoServidos = registrosItensAtivos.filter(
      (registro) => registro.status === StatusItemBuffetAmostra.NAO_SERVIDO
    ).length;
    const itensIniciados = registrosItensAtivos.filter(
      (registro) => registro.status !== StatusItemBuffetAmostra.PENDENTE
    ).length;

    const status = calcularStatusServico({
      totalItens: quantidadeItens,
      itensAssinados,
      itensNaoServidos,
      itensIniciados
    });

    return {
      id: servico.id,
      nome: servico.nome,
      observacao: servico.observacao,
      tipoServico: servico.tipoServico,
      periodo: getServicoPeriodoLabel(servico),
      quantidadeItens,
      status
    };
  });

  const rangeFechamento = getMonthDateRange(fechamentoMes, fechamentoAno);
  const registrosFechamento = await prisma.controleBuffetAmostraRegistro.findMany({
    where: {
      data: {
        gte: rangeFechamento.start,
        lte: rangeFechamento.end
      }
    },
    include: {
      servico: {
        select: {
          nome: true,
          tipoServico: true,
          dataInicio: true,
          dataFim: true
        }
      }
    },
    orderBy: [
      { data: "asc" },
      { servico: { ordem: "asc" } },
      { itemExtra: "asc" },
      { itemNome: "asc" }
    ]
  });
  const expectedItemCountsByServiceId = new Map(
    servicos.map((servico) => [servico.id, servico.itens.length])
  );
  const gruposFechamento = buildBuffetServiceHistoryGroups(
    registrosFechamento,
    expectedItemCountsByServiceId
  );
  const totalizadoresFechamento = buildBuffetServiceHistoryTotals(gruposFechamento);

  const fechamentoAssinado = fechamentoAtual?.status === StatusFechamentoBuffetAmostra.ASSINADO;
  const fechamentoDiaAssinado =
    fechamentoDiaAtual?.status === StatusFechamentoBuffetAmostra.ASSINADO;
  const reaberturaFormId = `reabertura-buffet-${fechamentoMes}-${fechamentoAno}`;
  const returnTo = buildPathWithParams(
    new URLSearchParams({
      fechamentoMes: String(fechamentoMes),
      fechamentoAno: String(fechamentoAno)
    })
  );

  return (
    <div className="space-y-6 dark:text-slate-100">
      <DocumentosModuleHeader
        title="Controle de Buffet / Amostras"
        description="Controle diário de temperatura e amostras dos serviços"
        modulo={ModuloDocumento.CONTROLE_BUFFET_AMOSTRAS}
        modulePath={MODULE_PATH}
        searchParams={params}
        managementHref={podeGerenciarOpcoes ? `${MODULE_PATH}/opcoes` : undefined}
        maintenanceHref="/chamados-manutencao?origem=BUFFET_AMOSTRAS"
        actions={
          <>
            {podeVerGestao ? (
              <Link href={`${MODULE_PATH}/historico`} className="btn-secondary">
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

      <section className={CARD_CLASS}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Serviços do Dia ({formatDateDisplay(today)})
          </h2>
          <SporadicServiceModal
            todayInput={todayInput}
            disabled={fechamentoDiaAssinado}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Serviço</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Itens Configurados</th>
                <th className="px-3 py-2">Status Geral</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {servicosDoDia.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                    Nenhum serviço previsto para hoje.
                  </td>
                </tr>
              ) : (
                servicosDoDia.map((servico) => (
                  <tr key={servico.id}>
                    <td className="px-3 py-2">{formatDateDisplay(today)}</td>
                    <td className="px-3 py-2">
                      {servico.nome}
                      {servico.observacao ? (
                        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                          {servico.observacao}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {getTipoServicoLabel(servico.tipoServico)}
                      {servico.tipoServico === "ESPORADICO" ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {servico.periodo}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{servico.quantidadeItens}</td>
                    <td className="px-3 py-2">
                      <ServiceStatusBadge status={servico.status} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`${MODULE_PATH}/servico/${servico.id}?data=${todayInput}`}
                        className="btn-action"
                      >
                        Abrir Serviço
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {podeVerGestao ? (
      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Fechamento Mensal
        </h2>

        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4 dark:bg-slate-800">
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

          <BuffetServiceHistoryList
            groups={gruposFechamento}
            totals={totalizadoresFechamento}
            emptyMessage="Nenhum registro no período selecionado."
          />

          {fechamentoAssinado ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
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
                  <ReopenMonthModal mes={fechamentoMes} ano={fechamentoAno} formId={reaberturaFormId} />
                </>
              ) : (
                <p className="mt-3 text-xs">
                  Somente o perfil DEV pode reabrir meses em ambiente de testes.
                </p>
              )}
            </div>
          ) : podeFechar ? (
            <form action={closeMonthAction} className="mt-4 grid gap-3 md:grid-cols-2">
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
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              Seu perfil não possui permissão para assinar o fechamento mensal.
            </p>
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
