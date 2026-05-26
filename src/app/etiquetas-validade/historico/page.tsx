import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal } from "@/components/ui/action-modal";
import { requireAuthenticatedUser } from "@/lib/auth-session";
import {
  formatAppDate,
  formatAppDateTime,
  getEndOfAppDay,
  getStartOfAppDay,
  parseAppDateInput
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { canAccessValidityLabels } from "@/lib/rbac";

import {
  CARD_CLASS,
  DEFAULT_PRINT_CONFIG,
  HISTORY_PATH,
  INPUT_CLASS,
  MODULE_PATH,
  type PrintConfig
} from "../constants";
import { EtiquetaCard, EtiquetaPrintStyles } from "../label-card";
import { PrintButton } from "../print-button";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function labelDate(date: Date, time?: string | null): string {
  return time ? `${formatAppDate(date)} ${time}` : formatAppDate(date);
}

function quantityLabel(params: {
  quantidade: string | null;
  unidadeMedidaSnapshot: string;
}): string {
  return params.quantidade?.trim()
    ? `${params.quantidade.trim()} ${params.unidadeMedidaSnapshot}`
    : "-";
}

function buildHistoryPath(params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${HISTORY_PATH}?${queryString}` : HISTORY_PATH;
}

export default async function EtiquetasValidadeHistoricoPage({
  searchParams
}: PageProps) {
  const user = await requireAuthenticatedUser();
  if (!canAccessValidityLabels(user.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const filtroEmissaoInput = firstParam(params.filtroEmissao).trim();
  const filtroItem = firstParam(params.filtroItem).trim();
  const filtroClassificacao = firstParam(params.filtroClassificacao).trim();
  const filtroCodigo = firstParam(params.filtroCodigo).trim();
  const filtroResponsavel = firstParam(params.filtroResponsavel).trim();
  const etiquetaId = parsePositiveInt(firstParam(params.etiquetaId).trim());

  const where: Prisma.EtiquetaValidadeGeradaWhereInput = {};
  const filtroEmissao = parseAppDateInput(filtroEmissaoInput);
  if (filtroEmissao) {
    where.criadoEm = {
      gte: getStartOfAppDay(filtroEmissao),
      lte: getEndOfAppDay(filtroEmissao)
    };
  }

  if (filtroItem) {
    where.nomeItemSnapshot = { contains: filtroItem, mode: "insensitive" };
  }

  if (filtroClassificacao) {
    where.nomeClassificacaoSnapshot = {
      contains: filtroClassificacao,
      mode: "insensitive"
    };
  }

  if (filtroCodigo) {
    where.codigoEtiqueta = { contains: filtroCodigo, mode: "insensitive" };
  }

  if (filtroResponsavel) {
    where.responsavelNomeSnapshot = {
      contains: filtroResponsavel,
      mode: "insensitive"
    };
  }

  const [etiquetas, etiquetaSelecionada, configuracaoDb] = await Promise.all([
    prisma.etiquetaValidadeGerada.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }],
      take: 150
    }),
    etiquetaId
      ? prisma.etiquetaValidadeGerada.findUnique({ where: { id: etiquetaId } })
      : Promise.resolve(null),
    prisma.etiquetaValidadeConfiguracaoImpressao.findFirst({
      orderBy: { id: "asc" }
    })
  ]);

  const configuracao: PrintConfig = configuracaoDb ?? DEFAULT_PRINT_CONFIG;
  const filtrosAtuais = new URLSearchParams();
  if (filtroEmissaoInput) filtrosAtuais.set("filtroEmissao", filtroEmissaoInput);
  if (filtroItem) filtrosAtuais.set("filtroItem", filtroItem);
  if (filtroClassificacao) filtrosAtuais.set("filtroClassificacao", filtroClassificacao);
  if (filtroCodigo) filtrosAtuais.set("filtroCodigo", filtroCodigo);
  if (filtroResponsavel) filtrosAtuais.set("filtroResponsavel", filtroResponsavel);
  const closeModalHref = buildHistoryPath(filtrosAtuais);

  return (
    <div className="space-y-6 dark:text-slate-100">
      <EtiquetaPrintStyles config={configuracao} />

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Histórico Completo - Etiquetas de Validade
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Consulta de etiquetas emitidas, com snapshot dos dados usados na geração.
            </p>
          </div>
          <div className="btn-group">
            <Link href={MODULE_PATH} className="btn-secondary">
              Voltar ao Módulo
            </Link>
          </div>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Filtros
        </h2>
        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-5">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data de emissão
            <input
              type="date"
              name="filtroEmissao"
              defaultValue={filtroEmissaoInput}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Item
            <input name="filtroItem" defaultValue={filtroItem} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Classificação
            <input
              name="filtroClassificacao"
              defaultValue={filtroClassificacao}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Código
            <input name="filtroCodigo" defaultValue={filtroCodigo} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Responsável
            <input
              name="filtroResponsavel"
              defaultValue={filtroResponsavel}
              className={INPUT_CLASS}
            />
          </label>
          <div className="btn-group md:col-span-5">
            <button type="submit" className="btn-primary">
              Aplicar Filtros
            </button>
            <Link href={HISTORY_PATH} className="btn-secondary">
              Limpar
            </Link>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Etiquetas ({etiquetas.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Emissão</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Classificação</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Manipulação</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {etiquetas.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={9}>
                    Nenhuma etiqueta encontrada.
                  </td>
                </tr>
              ) : (
                etiquetas.map((etiqueta) => {
                  const viewParams = new URLSearchParams(filtrosAtuais);
                  viewParams.set("etiquetaId", String(etiqueta.id));

                  return (
                    <tr key={etiqueta.id}>
                      <td className="px-3 py-2">{formatAppDateTime(etiqueta.criadoEm)}</td>
                      <td className="px-3 py-2">{etiqueta.nomeItemSnapshot}</td>
                      <td className="px-3 py-2">
                        {etiqueta.nomeClassificacaoSnapshot}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {etiqueta.validadeDiasSnapshot} dia(s)
                        </p>
                      </td>
                      <td className="px-3 py-2">{quantityLabel(etiqueta)}</td>
                      <td className="px-3 py-2">
                        {labelDate(etiqueta.dataManipulacao, etiqueta.horaManipulacao)}
                      </td>
                      <td className="px-3 py-2">
                        {labelDate(etiqueta.dataValidade, etiqueta.horaValidade)}
                      </td>
                      <td className="px-3 py-2">{etiqueta.responsavelNomeSnapshot}</td>
                      <td className="px-3 py-2 font-medium">{etiqueta.codigoEtiqueta}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={buildHistoryPath(viewParams)}
                          scroll={false}
                          className="btn-secondary"
                        >
                          Visualizar
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {etiquetaSelecionada ? (
        <ActionModal
          title={`Etiqueta ${etiquetaSelecionada.codigoEtiqueta}`}
          cancelHref={closeModalHref}
          maxWidthClassName="max-w-4xl"
        >
          <div className="mb-4 flex justify-end">
            <PrintButton />
          </div>
          <EtiquetaCard etiqueta={etiquetaSelecionada} config={configuracao} />
        </ActionModal>
      ) : null}
    </div>
  );
}
