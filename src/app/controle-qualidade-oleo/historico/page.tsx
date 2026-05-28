import { Prisma, StatusQualidadeOleo } from "@prisma/client";
import Link from "next/link";

import { SignatureContextCard } from "@/components/auth/signature-context-card";
import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canSignNutritionReview, getRoleLabel } from "@/lib/rbac";

import { signRegistroSupervisorAction } from "../actions";
import { OilStatusBadge } from "../oil-status-badge";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTemperatureDisplay,
  getMonthDateRange,
  getYearDateRange,
  parseDateInput,
  parsePositiveInt
} from "../utils";

const PAGE_PATH = "/controle-qualidade-oleo/historico";
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
  return query ? `${PAGE_PATH}?${query}` : PAGE_PATH;
}

function parseStatusFilter(value: string): StatusQualidadeOleo | null {
  if (value === StatusQualidadeOleo.ADEQUADO) return StatusQualidadeOleo.ADEQUADO;
  if (value === StatusQualidadeOleo.ATENCAO) return StatusQualidadeOleo.ATENCAO;
  if (value === StatusQualidadeOleo.ULTIMA_UTILIZACAO) return StatusQualidadeOleo.ULTIMA_UTILIZACAO;
  if (value === StatusQualidadeOleo.DESCARTAR) return StatusQualidadeOleo.DESCARTAR;
  if (value === StatusQualidadeOleo.SEM_UTILIZACAO) return StatusQualidadeOleo.SEM_UTILIZACAO;
  return null;
}

export default async function ControleQualidadeOleoHistoricoPage({ searchParams }: PageProps) {
  const authUser = await getCurrentUser();
  const usuarioLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const podeAssinarSupervisor = authUser ? canSignNutritionReview(authUser.perfil) : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  const filtroData = firstParam(params.filtroData).trim();
  const filtroMes = parsePositiveInt(firstParam(params.filtroMes));
  const filtroAno = parsePositiveInt(firstParam(params.filtroAno));
  const filtroFita = firstParam(params.filtroFita).trim();
  const filtroStatus = parseStatusFilter(firstParam(params.filtroStatus).trim());
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const signSupervisorId = parsePositiveInt(firstParam(params.signSupervisorId));

  const where: Prisma.ControleQualidadeOleoRegistroWhereInput = {};
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

  if (filtroFita) {
    where.fitaOleo = { contains: filtroFita, mode: "insensitive" };
  }

  if (filtroStatus) {
    where.status = filtroStatus;
  }

  if (filtroResponsavel) {
    where.responsavel = { contains: filtroResponsavel, mode: "insensitive" };
  }

  const [registros, fitaOptions] = await Promise.all([
    prisma.controleQualidadeOleoRegistro.findMany({
      where,
      orderBy: [{ data: "desc" }, { createdAt: "desc" }]
    }),
    prisma.controleQualidadeOleoOpcaoFita.findMany({
      orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { rotulo: "asc" }]
    })
  ]);
  const parametrosRetorno = new URLSearchParams();
  if (filtroData) parametrosRetorno.set("filtroData", filtroData);
  if (filtroMes) parametrosRetorno.set("filtroMes", String(filtroMes));
  if (filtroAno) parametrosRetorno.set("filtroAno", String(filtroAno));
  if (filtroFita) parametrosRetorno.set("filtroFita", filtroFita);
  if (filtroStatus) parametrosRetorno.set("filtroStatus", filtroStatus);
  if (filtroResponsavel) parametrosRetorno.set("filtroResponsavel", filtroResponsavel);

  const returnTo = buildPathWithParams(parametrosRetorno);
  const registroParaAssinaturaSupervisor = signSupervisorId
    ? registros.find((registro) => registro.id === signSupervisorId) ??
      (await prisma.controleQualidadeOleoRegistro.findUnique({ where: { id: signSupervisorId } }))
    : null;
  const signSupervisorReturnTo = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    if (registroParaAssinaturaSupervisor) {
      query.set("signSupervisorId", String(registroParaAssinaturaSupervisor.id));
    }
    return buildPathWithParams(query);
  })();
  const buildSignSupervisorHref = (id: number): string => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("signSupervisorId", String(id));
    return buildPathWithParams(query);
  };

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Histórico Completo
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Consulta de todos os registros de qualidade do óleo.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Usuário logado: {usuarioLogado} ({perfilLogado})
            </p>
          </div>
          <div className="btn-group">
            <Link href="/controle-qualidade-oleo" className="btn-secondary">
              ← Voltar ao Módulo
            </Link>
          </div>
        </div>
      </section>

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
            % da Fita
            <select name="filtroFita" defaultValue={filtroFita} className={INPUT_CLASS}>
              <option value="">Todas</option>
              {fitaOptions.map((option) => (
                <option key={option.id} value={option.rotulo}>
                  {option.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="filtroStatus" defaultValue={filtroStatus ?? ""} className={INPUT_CLASS}>
              <option value="">Todos</option>
              <option value={StatusQualidadeOleo.ADEQUADO}>Adequado</option>
              <option value={StatusQualidadeOleo.ATENCAO}>Atenção</option>
              <option value={StatusQualidadeOleo.ULTIMA_UTILIZACAO}>Última Utilização</option>
              <option value={StatusQualidadeOleo.DESCARTAR}>Descartar</option>
              <option value={StatusQualidadeOleo.SEM_UTILIZACAO}>Sem Utilização</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Responsável
            <input type="text" name="filtroResponsavel" defaultValue={filtroResponsavel} className={INPUT_CLASS} />
          </label>

          <div className="btn-group md:col-span-6">
            <button type="submit" className="btn-primary">Aplicar Filtros</button>
            <Link href={PAGE_PATH} className="btn-secondary">Limpar</Link>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Registros ({registros.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">% da Fita</th>
                <th className="px-3 py-2">Temperatura</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Supervisor</th>
                <th className="px-3 py-2 min-w-52">Observação</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registros.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={8}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => {
                  const supervisorAssinado = Boolean(registro.assinaturaSupervisorEm);
                  const assinaturaSupervisor = supervisorAssinado ? (
                    <div className="space-y-1">
                      <p className="font-medium text-emerald-700 dark:text-emerald-200">
                        Assinado pelo Supervisor
                      </p>
                      <p>
                        {registro.assinaturaSupervisorNome ?? "Supervisor"}
                        {registro.assinaturaSupervisorPerfil
                          ? ` (${getRoleLabel(registro.assinaturaSupervisorPerfil)})`
                          : ""}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {registro.assinaturaSupervisorEm
                          ? formatDateTimeDisplay(registro.assinaturaSupervisorEm)
                          : "-"}
                      </p>
                    </div>
                  ) : (
                    "Pendente de assinatura do supervisor"
                  );

                  return (
                    <tr key={registro.id}>
                      <td className="px-3 py-2">{formatDateDisplay(registro.data)}</td>
                      <td className="px-3 py-2">{registro.fitaOleo ?? "-"}</td>
                      <td className={`px-3 py-2 ${registro.temperaturaCritica ? "text-red-600 dark:text-red-300" : ""}`}>
                        {formatTemperatureDisplay(registro.temperatura)}
                      </td>
                      <td className="px-3 py-2">
                        <OilStatusBadge status={registro.status} temperaturaCritica={registro.temperaturaCritica} />
                      </td>
                      <td className="px-3 py-2">{registro.responsavel}</td>
                      <td className="px-3 py-2">{assinaturaSupervisor}</td>
                      <td className="px-3 py-2 max-w-64 whitespace-normal break-words">{registro.observacao ?? "-"}</td>
                      <td className="px-3 py-2">
                        {podeAssinarSupervisor && !supervisorAssinado ? (
                          <Link
                            href={buildSignSupervisorHref(registro.id)}
                            scroll={false}
                            className="btn-action"
                          >
                            Assinatura Supervisor
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sem ação
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

      {registroParaAssinaturaSupervisor &&
      podeAssinarSupervisor &&
      !registroParaAssinaturaSupervisor.assinaturaSupervisorEm ? (
        <ActionModal
          title="Assinatura do Supervisor"
          cancelHref={returnTo}
          description={
            <p>
              Registro de óleo de {formatDateDisplay(registroParaAssinaturaSupervisor.data)}.
            </p>
          }
        >
          {feedback && feedbackType === "error" ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {feedback}
            </p>
          ) : null}
          <form action={signRegistroSupervisorAction} className="space-y-4">
            <input type="hidden" name="id" value={registroParaAssinaturaSupervisor.id} />
            <input type="hidden" name="returnTo" value={signSupervisorReturnTo} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja assinar este registro como revisado pelo supervisor?
            </p>
            <label className="block text-sm text-slate-700 dark:text-slate-200">
              Confirme sua senha *
              <input type="password" name="senhaConfirmacao" required className={INPUT_CLASS} />
            </label>
            <SignatureContextCard
              nomeUsuario={usuarioLogado}
              perfil={perfilLogado}
              dataHora={formatDateTimeDisplay(new Date())}
            />
            <ModalActions>
              <Link href={returnTo} className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Assinatura Supervisor
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
