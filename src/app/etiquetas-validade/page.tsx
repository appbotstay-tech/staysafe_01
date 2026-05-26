import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { requireAuthenticatedUser } from "@/lib/auth-session";
import {
  formatAppDate,
  formatAppDateInput,
  formatAppDateTime,
  getAppDate
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { canAccessValidityLabels } from "@/lib/rbac";

import {
  createClassificacaoAction,
  createItemAction,
  toggleClassificacaoStatusAction,
  toggleItemStatusAction,
  updateClassificacaoAction,
  updateItemAction,
  updatePrintConfigAction
} from "./actions";
import { LabelGeneratorForm, type LabelItemOption } from "./label-generator-form";
import { PrintButton } from "./print-button";

const MODULE_PATH = "/etiquetas-validade";
const CARD_CLASS = "bpma-card";
const INPUT_CLASS = "bpma-input";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };
type PrintConfig = {
  larguraMm: number;
  alturaMm: number;
  margemMm: number;
  tamanhoFonte: number;
  mostrarQrCode: boolean;
  mostrarSif: boolean;
  mostrarLote: boolean;
  mostrarMarcaFornecedor: boolean;
};

const DEFAULT_PRINT_CONFIG: PrintConfig = {
  larguraMm: 80,
  alturaMm: 50,
  margemMm: 3,
  tamanhoFonte: 11,
  mostrarQrCode: false,
  mostrarSif: true,
  mostrarLote: true,
  mostrarMarcaFornecedor: true
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildPathWithParams(params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${MODULE_PATH}?${queryString}` : MODULE_PATH;
}

function statusBadgeClass(active: boolean): string {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function labelDate(date: Date, time?: string | null): string {
  return time ? `${formatAppDate(date)} ${time}` : formatAppDate(date);
}

function optionalText(value?: string | null): string {
  return value?.trim() || "-";
}

function LabelInfo({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <p className="leading-tight">
      <span className="font-semibold">{label}:</span> {value}
    </p>
  );
}

export default async function EtiquetasValidadePage({ searchParams }: PageProps) {
  const user = await requireAuthenticatedUser();
  if (!canAccessValidityLabels(user.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editClassificacaoId = parsePositiveInt(
    firstParam(params.editClassificacaoId).trim()
  );
  const editItemId = parsePositiveInt(firstParam(params.editItemId).trim());
  const etiquetaId = parsePositiveInt(firstParam(params.etiquetaId).trim());

  const [classificacoes, itens, historico, configuracaoDb] = await Promise.all([
    prisma.etiquetaValidadeClassificacao.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeItem.findMany({
      include: { classificacao: true },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeGerada.findMany({
      orderBy: [{ criadoEm: "desc" }],
      take: 30
    }),
    prisma.etiquetaValidadeConfiguracaoImpressao.findFirst({
      orderBy: { id: "asc" }
    })
  ]);

  const etiquetaSelecionada = etiquetaId
    ? await prisma.etiquetaValidadeGerada.findUnique({ where: { id: etiquetaId } })
    : null;
  const etiquetaVisualizacao = etiquetaSelecionada ?? historico[0] ?? null;
  const configuracao: PrintConfig = configuracaoDb ?? DEFAULT_PRINT_CONFIG;
  const activeClassificacoes = classificacoes.filter((item) => item.ativo);
  const activeItems: LabelItemOption[] = itens
    .filter((item) => item.ativo && item.classificacao.ativo)
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      classificacaoNome: item.classificacao.nome,
      validadeDias: item.classificacao.validadeDias,
      marcaFornecedor: item.marcaFornecedor ?? "",
      unidadePadrao: item.unidadePadrao ?? ""
    }));

  const baseParams = new URLSearchParams();
  if (etiquetaVisualizacao) {
    baseParams.set("etiquetaId", String(etiquetaVisualizacao.id));
  }
  const returnTo = buildPathWithParams(baseParams);
  const classificacaoEdicao = editClassificacaoId
    ? classificacoes.find((item) => item.id === editClassificacaoId) ?? null
    : null;
  const itemEdicao = editItemId
    ? itens.find((item) => item.id === editItemId) ?? null
    : null;
  const itemEdicaoClassificacoes = itemEdicao
    ? classificacoes.filter(
        (classificacao) =>
          classificacao.ativo || classificacao.id === itemEdicao.classificacaoId
      )
    : activeClassificacoes;
  const printStyles = `
    @media print {
      @page {
        size: ${configuracao.larguraMm}mm ${configuracao.alturaMm}mm;
        margin: ${configuracao.margemMm}mm;
      }
      body * {
        visibility: hidden !important;
      }
      #etiqueta-print-area,
      #etiqueta-print-area * {
        visibility: visible !important;
      }
      #etiqueta-print-area {
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Etiquetas de Validade
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Módulo interno para geração de etiquetas de identificação e validade de alimentos manipulados.
            </p>
            <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Módulo em desenvolvimento. Disponível apenas para DEV.
            </p>
          </div>
          <Link href="/" className="btn-secondary">
            Voltar ao Dashboard
          </Link>
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Gerar Etiqueta
        </h2>
        <LabelGeneratorForm
          items={activeItems}
          responsavelNome={user.nomeCompleto}
          defaultDate={formatAppDateInput(getAppDate())}
          returnTo={returnTo}
        />
      </section>

      <section className={CARD_CLASS}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Etiqueta
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Layout HTML/CSS imprimível, preparado para ajuste por bobina e futura geração ZPL.
            </p>
          </div>
          {etiquetaVisualizacao ? <PrintButton /> : null}
        </div>

        {etiquetaVisualizacao ? (
          <div id="etiqueta-print-area" className="overflow-x-auto">
            <article
              className="rounded border border-slate-900 bg-white p-3 text-slate-950 shadow-sm"
              data-zebra-model="ZD220"
              data-zpl-ready="future"
              style={{
                width: `${configuracao.larguraMm}mm`,
                minHeight: `${configuracao.alturaMm}mm`,
                padding: `${configuracao.margemMm}mm`,
                fontSize: `${configuracao.tamanhoFonte}pt`,
                lineHeight: 1.18
              }}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-black uppercase leading-tight">
                    {etiquetaVisualizacao.nomeItemSnapshot}
                  </h3>
                  <p className="text-[0.72em]">
                    Classificação: {etiquetaVisualizacao.nomeClassificacaoSnapshot}
                  </p>
                </div>
                {configuracao.mostrarQrCode ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-900 p-1 text-center text-[0.55em] font-bold leading-tight">
                    {etiquetaVisualizacao.codigoEtiqueta}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <LabelInfo
                  label="Manipulação"
                  value={labelDate(
                    etiquetaVisualizacao.dataManipulacao,
                    etiquetaVisualizacao.horaManipulacao
                  )}
                />
                <LabelInfo
                  label="Validade"
                  value={labelDate(
                    etiquetaVisualizacao.dataValidade,
                    etiquetaVisualizacao.horaValidade
                  )}
                />
                <LabelInfo label="Resp." value={etiquetaVisualizacao.responsavelNomeSnapshot} />
                <LabelInfo
                  label="Qtd./peso"
                  value={optionalText(etiquetaVisualizacao.quantidadePeso)}
                />
                {configuracao.mostrarMarcaFornecedor ? (
                  <LabelInfo
                    label="Marca/Forn."
                    value={optionalText(etiquetaVisualizacao.marcaFornecedorSnapshot)}
                  />
                ) : null}
                {configuracao.mostrarSif ? (
                  <LabelInfo label="SIF" value={optionalText(etiquetaVisualizacao.sif)} />
                ) : null}
                {configuracao.mostrarLote ? (
                  <LabelInfo label="Lote" value={optionalText(etiquetaVisualizacao.lote)} />
                ) : null}
                <LabelInfo
                  label="Gerada"
                  value={formatAppDateTime(etiquetaVisualizacao.criadoEm)}
                />
              </div>

              {etiquetaVisualizacao.observacao ? (
                <p className="mt-2 border-t border-slate-300 pt-1 text-[0.8em]">
                  Obs.: {etiquetaVisualizacao.observacao}
                </p>
              ) : null}

              <p className="mt-2 border-t border-slate-900 pt-1 text-center text-[0.8em] font-bold">
                Código: {etiquetaVisualizacao.codigoEtiqueta}
              </p>
            </article>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Gere uma etiqueta para visualizar o cartão de impressão.
          </p>
        )}
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Classificações
        </h2>
        <form
          action={createClassificacaoAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Nome da classificação *
            <input name="nome" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade em dias *
            <input name="validadeDias" type="number" min={1} required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="ativo" defaultValue="true" className={INPUT_CLASS}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-4">
            Descrição/orientação
            <textarea name="descricao" rows={3} className={INPUT_CLASS} />
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">
              Cadastrar classificação
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Classificação</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Atualizado</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classificacoes.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Nenhuma classificação cadastrada.
                  </td>
                </tr>
              ) : (
                classificacoes.map((classificacao) => {
                  const editHref = buildPathWithParams(
                    new URLSearchParams([
                      ["editClassificacaoId", String(classificacao.id)]
                    ])
                  );

                  return (
                    <tr key={classificacao.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {classificacao.nome}
                        </p>
                        {classificacao.descricao ? (
                          <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">
                            {classificacao.descricao}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{classificacao.validadeDias} dia(s)</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(classificacao.ativo)}`}>
                          {classificacao.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatAppDateTime(classificacao.atualizadoEm)}</td>
                      <td className="px-3 py-2">
                        <div className="btn-group">
                          <Link href={editHref} scroll={false} className="btn-secondary">
                            Editar
                          </Link>
                          <form action={toggleClassificacaoStatusAction}>
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="id" value={String(classificacao.id)} />
                            <button type="submit" className="btn-secondary">
                              {classificacao.ativo ? "Inativar" : "Ativar"}
                            </button>
                          </form>
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

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Itens
        </h2>
        <form
          action={createItemAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Nome do item/produto *
            <input name="nome" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Classificação *
            <select name="classificacaoId" required className={INPUT_CLASS}>
              <option value="">Selecione</option>
              {activeClassificacoes.map((classificacao) => (
                <option key={classificacao.id} value={String(classificacao.id)}>
                  {classificacao.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="ativo" defaultValue="true" className={INPUT_CLASS}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Marca/fornecedor
            <input name="marcaFornecedor" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Unidade/peso padrão
            <input name="unidadePadrao" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Observação
            <input name="observacao" className={INPUT_CLASS} />
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">
              Cadastrar item
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Classificação</th>
                <th className="px-3 py-2">Padrão</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {itens.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Nenhum item cadastrado.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const editHref = buildPathWithParams(
                    new URLSearchParams([["editItemId", String(item.id)]])
                  );

                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.nome}
                        </p>
                        {item.observacao ? (
                          <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">
                            {item.observacao}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {item.classificacao.nome} ({item.classificacao.validadeDias} dia(s))
                      </td>
                      <td className="px-3 py-2">
                        {[item.marcaFornecedor, item.unidadePadrao].filter(Boolean).join(" | ") || "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(item.ativo)}`}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="btn-group">
                          <Link href={editHref} scroll={false} className="btn-secondary">
                            Editar
                          </Link>
                          <form action={toggleItemStatusAction}>
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="id" value={String(item.id)} />
                            <button type="submit" className="btn-secondary">
                              {item.ativo ? "Inativar" : "Ativar"}
                            </button>
                          </form>
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

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Histórico
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Manipulação</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historico.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                    Nenhuma etiqueta gerada ainda.
                  </td>
                </tr>
              ) : (
                historico.map((etiqueta) => (
                  <tr key={etiqueta.id}>
                    <td className="px-3 py-2 font-medium">{etiqueta.codigoEtiqueta}</td>
                    <td className="px-3 py-2">
                      {etiqueta.nomeItemSnapshot}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {etiqueta.nomeClassificacaoSnapshot}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {labelDate(etiqueta.dataManipulacao, etiqueta.horaManipulacao)}
                    </td>
                    <td className="px-3 py-2">
                      {labelDate(etiqueta.dataValidade, etiqueta.horaValidade)}
                    </td>
                    <td className="px-3 py-2">{etiqueta.responsavelNomeSnapshot}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`${MODULE_PATH}?etiquetaId=${etiqueta.id}`}
                        scroll={false}
                        className="btn-secondary"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Configuração de Impressão
        </h2>
        <form
          action={updatePrintConfigAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Largura (mm)
            <input
              name="larguraMm"
              type="number"
              min={20}
              defaultValue={configuracao.larguraMm}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Altura (mm)
            <input
              name="alturaMm"
              type="number"
              min={20}
              defaultValue={configuracao.alturaMm}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Margem (mm)
            <input
              name="margemMm"
              type="number"
              min={1}
              defaultValue={configuracao.margemMm}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Fonte (pt)
            <input
              name="tamanhoFonte"
              type="number"
              min={7}
              defaultValue={configuracao.tamanhoFonte}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="mostrarQrCode"
              defaultChecked={configuracao.mostrarQrCode}
            />
            Mostrar área de QR Code
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="mostrarSif"
              defaultChecked={configuracao.mostrarSif}
            />
            Mostrar SIF
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="mostrarLote"
              defaultChecked={configuracao.mostrarLote}
            />
            Mostrar lote
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              name="mostrarMarcaFornecedor"
              defaultChecked={configuracao.mostrarMarcaFornecedor}
            />
            Mostrar marca/fornecedor
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">
              Salvar configuração
            </button>
          </div>
        </form>
      </section>

      {classificacaoEdicao ? (
        <ActionModal
          title="Editar classificação"
          cancelHref={returnTo}
          maxWidthClassName="max-w-3xl"
        >
          <form action={updateClassificacaoAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={String(classificacaoEdicao.id)} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome *
              <input
                name="nome"
                required
                defaultValue={classificacaoEdicao.nome}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Validade em dias *
              <input
                name="validadeDias"
                type="number"
                min={1}
                required
                defaultValue={classificacaoEdicao.validadeDias}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select
                name="ativo"
                defaultValue={classificacaoEdicao.ativo ? "true" : "false"}
                className={INPUT_CLASS}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Descrição/orientação
              <textarea
                name="descricao"
                rows={3}
                defaultValue={classificacaoEdicao.descricao ?? ""}
                className={INPUT_CLASS}
              />
            </label>
            <ModalActions>
              <Link href={returnTo} className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Salvar classificação
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {itemEdicao ? (
        <ActionModal title="Editar item" cancelHref={returnTo} maxWidthClassName="max-w-3xl">
          <form action={updateItemAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={String(itemEdicao.id)} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome *
              <input name="nome" required defaultValue={itemEdicao.nome} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Classificação *
              <select
                name="classificacaoId"
                required
                defaultValue={String(itemEdicao.classificacaoId)}
                className={INPUT_CLASS}
              >
                {itemEdicaoClassificacoes.map((classificacao) => (
                  <option key={classificacao.id} value={String(classificacao.id)}>
                    {classificacao.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select
                name="ativo"
                defaultValue={itemEdicao.ativo ? "true" : "false"}
                className={INPUT_CLASS}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Marca/fornecedor
              <input
                name="marcaFornecedor"
                defaultValue={itemEdicao.marcaFornecedor ?? ""}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Unidade/peso padrão
              <input
                name="unidadePadrao"
                defaultValue={itemEdicao.unidadePadrao ?? ""}
                className={INPUT_CLASS}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Observação
              <textarea
                name="observacao"
                rows={3}
                defaultValue={itemEdicao.observacao ?? ""}
                className={INPUT_CLASS}
              />
            </label>
            <ModalActions>
              <Link href={returnTo} className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Salvar item
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
