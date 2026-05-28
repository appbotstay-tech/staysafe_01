import {
  Prisma,
  StatusOperacionalEquipamento,
  StatusTemperaturaEquipamento
} from "@prisma/client";
import Link from "next/link";

import { SignatureContextCard } from "@/components/auth/signature-context-card";
import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import { getImageDataUrl } from "@/lib/image-upload";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRoleLabel } from "@/lib/rbac";

import { signRegistroNutricionistaAction } from "../actions";
import { TemperatureStatusBadge } from "../temperature-status-badge";
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatTemperatureDisplay,
  getMonthDateRange,
  getOperationalStatusLabel,
  getShiftLabel,
  getYearDateRange,
  isOperationalTemperatureStatus,
  parseDateInput,
  parsePositiveInt
} from "../utils";

const PAGE_PATH = "/controle-temperatura-equipamentos/historico";
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

export default async function ControleTemperaturaHistoricoPage({
  searchParams
}: PageProps) {
  const authUser = await getCurrentUser();
  const usuarioLogado = authUser?.nomeCompleto ?? "Usuário logado";
  const perfilLogado = authUser ? getRoleLabel(authUser.perfil) : "";
  const podeAssinarNutri = authUser
    ? hasPermission(authUser, "modulo.temperatura.assinar_historico")
    : false;

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  const filtroData = firstParam(params.filtroData).trim();
  const filtroMes = parsePositiveInt(firstParam(params.filtroMes));
  const filtroAno = parsePositiveInt(firstParam(params.filtroAno));
  const filtroEquipamento = firstParam(params.filtroEquipamento).trim();
  const filtroStatus = parseStatusFilter(firstParam(params.filtroStatus).trim());
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const fotoId = parsePositiveInt(firstParam(params.fotoId));
  const signNutriId = parsePositiveInt(firstParam(params.signNutriId));

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

  const registros = await prisma.controleTemperaturaEquipamento.findMany({
    where,
    orderBy: [{ data: "desc" }, { createdAt: "desc" }]
  });

  const parametrosRetorno = new URLSearchParams();
  if (filtroData) parametrosRetorno.set("filtroData", filtroData);
  if (filtroMes) parametrosRetorno.set("filtroMes", String(filtroMes));
  if (filtroAno) parametrosRetorno.set("filtroAno", String(filtroAno));
  if (filtroEquipamento) parametrosRetorno.set("filtroEquipamento", filtroEquipamento);
  if (filtroStatus) parametrosRetorno.set("filtroStatus", filtroStatus);
  if (filtroResponsavel) parametrosRetorno.set("filtroResponsavel", filtroResponsavel);

  const limparHref = PAGE_PATH;
  const returnTo = buildPathWithParams(parametrosRetorno);
  const registroFotoSelecionado = fotoId
    ? registros.find((registro) => registro.id === fotoId) ?? null
    : null;
  const fotoSelecionadaDataUrl = registroFotoSelecionado
    ? getImageDataUrl(registroFotoSelecionado.fotoMimeType, registroFotoSelecionado.fotoBase64)
    : null;
  const registroParaAssinaturaNutri = signNutriId
    ? registros.find((registro) => registro.id === signNutriId) ??
      (await prisma.controleTemperaturaEquipamento.findUnique({ where: { id: signNutriId } }))
    : null;
  const signNutriReturnTo = (() => {
    const query = new URLSearchParams(parametrosRetorno);
    if (registroParaAssinaturaNutri) {
      query.set("signNutriId", String(registroParaAssinaturaNutri.id));
    }
    return buildPathWithParams(query);
  })();
  const buildFotoHref = (id: number): string => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("fotoId", String(id));
    return buildPathWithParams(query);
  };
  const buildSignNutriHref = (id: number): string => {
    const query = new URLSearchParams(parametrosRetorno);
    query.set("signNutriId", String(id));
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
              Consulta de todos os registros de temperatura.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Usuário logado: {usuarioLogado} ({perfilLogado})
            </p>
          </div>
          <div className="btn-group">
            <Link href="/controle-temperatura-equipamentos" className="btn-secondary">
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
            <Link href={limparHref} className="btn-secondary">
              Limpar
            </Link>
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
                <th className="px-3 py-2">Equipamento</th>
                <th className="px-3 py-2">Turno</th>
                <th className="px-3 py-2">Status operacional</th>
                <th className="px-3 py-2">Temperatura</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 min-w-52">Ação Corretiva</th>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Supervisor</th>
                <th className="px-3 py-2">Observações</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {registros.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={12}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((registro) => {
                  const registroEmOperacao = isOperationalTemperatureStatus(
                    registro.statusOperacionalEquipamento
                  );
                  const observacaoRegistro = registroEmOperacao
                    ? registro.observacoes
                    : registro.observacaoStatusOperacional;
                  const hasStoredImage = Boolean(registro.fotoMimeType && registro.fotoBase64);
                  const assinaturaSupervisor = registro.assinaturaNutricionistaDataHora
                    ? `Assinado pelo Supervisor - ${registro.assinaturaNutricionistaNome ?? "Supervisor"}${
                        registro.assinaturaNutricionistaPerfil
                          ? ` (${getRoleLabel(registro.assinaturaNutricionistaPerfil)})`
                          : ""
                      } em ${formatDateTimeDisplay(registro.assinaturaNutricionistaDataHora)}`
                    : "Pendente de assinatura do supervisor";

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
                            href={buildFotoHref(registro.id)}
                            scroll={false}
                            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-slate-200"
                          >
                            Ver foto
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2">{registro.responsavel}</td>
                      <td className="px-3 py-2">{assinaturaSupervisor}</td>
                      <td className="px-3 py-2">{observacaoRegistro?.trim() || "-"}</td>
                      <td className="px-3 py-2">
                        {podeAssinarNutri && !registro.assinaturaNutricionistaDataHora ? (
                          <Link
                            href={buildSignNutriHref(registro.id)}
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

      {fotoId ? (
        <ActionModal
          title="Foto da evidência"
          cancelHref={returnTo}
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

      {registroParaAssinaturaNutri &&
      podeAssinarNutri &&
      !registroParaAssinaturaNutri.assinaturaNutricionistaDataHora ? (
        <ActionModal
          title="Assinatura do Supervisor"
          cancelHref={returnTo}
          description={
            <p>
              {registroParaAssinaturaNutri.equipamento} em{" "}
              {formatDateDisplay(registroParaAssinaturaNutri.data)}.
            </p>
          }
        >
          {feedback && feedbackType === "error" ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {feedback}
            </p>
          ) : null}
          <form action={signRegistroNutricionistaAction} className="space-y-4">
            <input type="hidden" name="id" value={registroParaAssinaturaNutri.id} />
            <input type="hidden" name="returnTo" value={signNutriReturnTo} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja assinar esta conferência como revisada pelo supervisor?
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
