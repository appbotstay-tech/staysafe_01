import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { requireAuthenticatedUser } from "@/lib/auth-session";
import { formatAppDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { canAccessValidityLabels } from "@/lib/rbac";

import {
  createClassificacaoAction,
  createItemAction,
  deleteClassificacaoAction,
  deleteItemAction,
  toggleClassificacaoStatusAction,
  toggleItemStatusAction,
  updateClassificacaoAction,
  updateItemAction,
  updatePrintConfigAction
} from "../actions";
import {
  CARD_CLASS,
  DEFAULT_PRINT_CONFIG,
  INPUT_CLASS,
  MODULE_PATH,
  OPTIONS_PATH,
  UNIT_OPTIONS,
  type PrintConfig
} from "../constants";
import { ConfirmSubmitButton } from "../confirm-submit-button";

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

function buildOptionsPath(params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${OPTIONS_PATH}?${queryString}` : OPTIONS_PATH;
}

function statusBadgeClass(active: boolean): string {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default async function EtiquetasValidadeOpcoesPage({ searchParams }: PageProps) {
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

  const [classificacoes, itens, configuracaoDb] = await Promise.all([
    prisma.etiquetaValidadeClassificacao.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeItem.findMany({
      include: { classificacao: true },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeConfiguracaoImpressao.findFirst({
      orderBy: { id: "asc" }
    })
  ]);

  const configuracao: PrintConfig = configuracaoDb ?? DEFAULT_PRINT_CONFIG;
  const activeClassificacoes = classificacoes.filter((item) => item.ativo);
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
  const podeExcluir = user.perfil === "DEV";

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar - Etiquetas de Validade
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configure classificações, itens e impressão do módulo interno StayLabel.
            </p>
          </div>
          <div className="btn-group">
            <Link href={MODULE_PATH} className="btn-secondary">
              Voltar ao Módulo
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Classificações
        </h2>
        <form
          action={createClassificacaoAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
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
                  const editHref = buildOptionsPath(
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
                            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                            <input type="hidden" name="id" value={String(classificacao.id)} />
                            <button type="submit" className="btn-secondary">
                              {classificacao.ativo ? "Inativar" : "Ativar"}
                            </button>
                          </form>
                          {podeExcluir ? (
                            <form action={deleteClassificacaoAction}>
                              <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                              <input type="hidden" name="id" value={String(classificacao.id)} />
                              <ConfirmSubmitButton
                                message="Deseja excluir esta classificação?"
                                className="btn-danger"
                              >
                                Excluir
                              </ConfirmSubmitButton>
                            </form>
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

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Itens
        </h2>
        <form
          action={createItemAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
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
            Unidade padrão *
            <select name="unidadeMedidaPadrao" required className={INPUT_CLASS}>
              <option value="">Selecione</option>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
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
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-3">
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
                <th className="px-3 py-2">Unidade padrão</th>
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
                  const editHref = buildOptionsPath(
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
                      <td className="px-3 py-2">{item.unidadeMedidaPadrao}</td>
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
                            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                            <input type="hidden" name="id" value={String(item.id)} />
                            <button type="submit" className="btn-secondary">
                              {item.ativo ? "Inativar" : "Ativar"}
                            </button>
                          </form>
                          {podeExcluir ? (
                            <form action={deleteItemAction}>
                              <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                              <input type="hidden" name="id" value={String(item.id)} />
                              <ConfirmSubmitButton
                                message={
                                  "Deseja excluir este item? Se houver etiquetas geradas, ele será inativado para preservar o histórico."
                                }
                                className="btn-danger"
                              >
                                Excluir
                              </ConfirmSubmitButton>
                            </form>
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

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Configuração de Impressão
        </h2>
        <form
          action={updatePrintConfigAction}
          className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
        >
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
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
          cancelHref={OPTIONS_PATH}
          maxWidthClassName="max-w-3xl"
        >
          <form action={updateClassificacaoAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
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
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">
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
        <ActionModal title="Editar item" cancelHref={OPTIONS_PATH} maxWidthClassName="max-w-3xl">
          <form action={updateItemAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
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
              Unidade padrão *
              <select
                name="unidadeMedidaPadrao"
                required
                defaultValue={itemEdicao.unidadeMedidaPadrao}
                className={INPUT_CLASS}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
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
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">
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
