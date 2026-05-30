import { ModuloDocumento } from "@prisma/client";
import Link from "next/link";

import { ModuleHeaderTextSettings } from "@/components/documentos/module-header-text-settings";
import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { prisma } from "@/lib/prisma";

import {
  createDailyAreaConfigAction,
  createDailyItemConfigAction,
  deleteDailyAreaConfigAction,
  deleteDailyItemConfigAction,
  toggleDailyAreaConfigStatusAction,
  toggleDailyItemConfigStatusAction,
  updateDailyAreaConfigAction,
  updateDailyItemConfigAction
} from "../../actions";
import { parsePositiveInt } from "../../utils";

const PAGE_PATH = "/plano-limpeza/diario/opcoes";
const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";

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

function getDraftValue(
  params: SearchParams,
  key: string,
  fallback: string
): string {
  const value = firstParam(params[key]).trim();
  return value || fallback;
}

function getDraftBoolean(
  params: SearchParams,
  key: string,
  fallback: boolean
): boolean {
  const value = firstParam(params[key]).trim();
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default async function PlanoLimpezaDiarioOpcoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editAreaId = parsePositiveInt(firstParam(params.editAreaId));
  const deleteAreaId = parsePositiveInt(firstParam(params.deleteAreaId));
  const editDailyItemId = parsePositiveInt(firstParam(params.editDailyItemId));
  const deleteDailyItemId = parsePositiveInt(firstParam(params.deleteDailyItemId));
  const newDailyItem = firstParam(params.newDailyItem).trim() === "true";

  const areas = await prisma.planoLimpezaDiarioArea.findMany({
    include: {
      itens: {
        where: { excluidoEm: null },
        orderBy: [{ ordem: "asc" }, { descricao: "asc" }]
      }
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }]
  });
  const itens = areas.flatMap((area) =>
    area.itens.map((item) => ({
      ...item,
      areaNome: area.nome
    }))
  );
  const itemEmEdicao = editDailyItemId
    ? itens.find((item) => item.id === editDailyItemId) ?? null
    : null;
  const itemParaExcluir = deleteDailyItemId
    ? itens.find((item) => item.id === deleteDailyItemId) ?? null
    : null;
  const modalAreaId = editAreaId ?? itemEmEdicao?.areaId ?? itemParaExcluir?.areaId ?? null;
  const areaEmEdicao = modalAreaId
    ? areas.find((area) => area.id === modalAreaId) ?? null
    : null;
  const areaParaExcluir = deleteAreaId
    ? areas.find((area) => area.id === deleteAreaId) ?? null
    : null;
  const areaParaExcluirItemIds = areaParaExcluir?.itens.map((item) => item.id) ?? [];
  const areaParaExcluirHistoricoReal = areaParaExcluir
    ? await prisma.planoLimpezaDiarioRegistro.count({
        where: {
          AND: [
            {
              OR: [
                { area: areaParaExcluir.nome },
                areaParaExcluirItemIds.length > 0
                  ? { itemId: { in: areaParaExcluirItemIds } }
                  : { id: -1 }
              ]
            },
            {
              OR: [
                { status: { not: "PENDENTE" } },
                { assinaturaResponsavel: { not: "" } },
                { assinaturaResponsavelUsuarioId: { not: null } },
                { assinaturaResponsavelDataHora: { not: null } },
                { assinaturaSupervisor: { not: "" } },
                { assinaturaSupervisorUsuarioId: { not: null } },
                { assinaturaSupervisorDataHora: { not: null } },
                { observacao: { not: null } },
                { observacaoResponsavel: { not: null } },
                { observacaoSupervisor: { not: null } }
              ]
            }
          ]
        }
      })
    : 0;
  const areaModalReturnTo = areaEmEdicao
    ? buildPathWithParams(new URLSearchParams({ editAreaId: String(areaEmEdicao.id) }))
    : PAGE_PATH;
  const itemEmEdicaoDaArea =
    itemEmEdicao && areaEmEdicao && itemEmEdicao.areaId === areaEmEdicao.id
      ? itemEmEdicao
      : null;
  const itemParaExcluirDaArea =
    itemParaExcluir && areaEmEdicao && itemParaExcluir.areaId === areaEmEdicao.id
      ? itemParaExcluir
      : null;
  const mostrarNovoItemDaArea =
    Boolean(areaEmEdicao) && newDailyItem && !itemEmEdicaoDaArea && !itemParaExcluirDaArea;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar Plano Diário
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configure áreas e itens/locais que serão assinados individualmente na rotina diária.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/plano-limpeza/diario" className="btn-secondary">
              ← Voltar ao Módulo
            </Link>
            <Link href="/plano-limpeza/diario/historico" className="btn-secondary">
              Histórico
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

      <ModuleHeaderTextSettings
        modulo={ModuloDocumento.PLANO_LIMPEZA_DIARIO}
        returnTo={PAGE_PATH}
      />

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nova Área</h2>
        <form action={createDailyAreaConfigAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="returnTo" value={PAGE_PATH} />

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Nome da Área *
            <input type="text" name="nome" required className={INPUT_CLASS} />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Ordem *
            <input type="number" min={1} name="ordem" defaultValue={areas.length + 1} required className={INPUT_CLASS} />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            O que deve ser limpo
            <textarea
              name="detalhamentoLimpeza"
              rows={3}
              className={INPUT_CLASS}
              placeholder="Ex.: Limpar prateleiras, paredes, piso, lixeiras, pallets, porta e rodapés."
            />
          </label>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Adicionar Área
            </button>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Áreas Configuradas
        </h2>

        <ul className="space-y-3">
          {areas.map((area) => (
              <li key={area.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {area.nome} • Ordem {area.ordem}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      <strong>Itens/locais ativos:</strong>{" "}
                      {area.itens.filter((item) => item.ativo && !item.excluidoEm).length}
                    </p>
                    {area.detalhamentoLimpeza ? (
                      <p className="mt-2 max-w-3xl whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">
                        <strong>O que deve ser limpo:</strong> {area.detalhamentoLimpeza}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {area.ativo ? "Ativo" : "Inativo"}
                    </p>
                  </div>

                  <div className="btn-group">
                    <Link href={`${PAGE_PATH}?editAreaId=${area.id}`} className="btn-action" scroll={false}>
                      Editar
                    </Link>
                    <Link href={`${PAGE_PATH}?deleteAreaId=${area.id}`} className="btn-danger" scroll={false}>
                      Excluir
                    </Link>

                    <form action={toggleDailyAreaConfigStatusAction}>
                      <input type="hidden" name="returnTo" value={PAGE_PATH} />
                      <input type="hidden" name="areaId" value={String(area.id)} />
                      <input type="hidden" name="ativo" value={area.ativo ? "false" : "true"} />
                      <button type="submit" className="btn-secondary">
                        {area.ativo ? "Inativar" : "Ativar"}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
          ))}
        </ul>
      </section>

      {areaEmEdicao ? (
        <div className="bpma-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar área do plano diário">
          <section className="bpma-modal-panel max-w-5xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Editar Área do Plano Diário
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Ajuste a área e gerencie os itens/locais vinculados a ela.
                </p>
              </div>
              <Link href={PAGE_PATH} className="btn-secondary shrink-0" scroll={false}>
                Fechar
              </Link>
            </div>

            {feedback ? (
              <p
                className={`mb-4 rounded-lg border p-3 text-sm ${
                  feedbackType === "error"
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                }`}
              >
                {feedback}
              </p>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
              <form
                action={updateDailyAreaConfigAction}
                className="grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-2"
              >
                <input type="hidden" name="returnTo" value={areaModalReturnTo} />
                <input type="hidden" name="areaId" value={String(areaEmEdicao.id)} />

                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 md:col-span-2">
                  Dados da área
                </h3>

                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Nome da Área *
                  <input
                    type="text"
                    name="nome"
                    required
                    defaultValue={getDraftValue(params, "nome", areaEmEdicao.nome)}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Ordem *
                  <input
                    type="number"
                    min={1}
                    name="ordem"
                    required
                    defaultValue={getDraftValue(params, "ordem", String(areaEmEdicao.ordem))}
                    className={INPUT_CLASS}
                  />
                </label>

                <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                  Status
                  <select
                    name="ativo"
                    defaultValue={
                      getDraftBoolean(params, "ativo", areaEmEdicao.ativo) ? "true" : "false"
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </label>

                <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                  O que deve ser limpo
                  <textarea
                    name="detalhamentoLimpeza"
                    rows={4}
                    defaultValue={getDraftValue(
                      params,
                      "detalhamentoLimpeza",
                      areaEmEdicao.detalhamentoLimpeza ?? ""
                    )}
                    className={INPUT_CLASS}
                    placeholder="Ex.: Limpar prateleiras, paredes, piso, lixeiras, pallets, porta e rodapés."
                  />
                </label>

                <div className="btn-group md:col-span-2">
                  <button type="submit" className="btn-primary">
                    Salvar área
                  </button>
                  <Link href={PAGE_PATH} className="btn-secondary" scroll={false}>
                    Cancelar
                  </Link>
                </div>
              </form>

              <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Itens/locais da área
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {areaEmEdicao.itens.length} item(ns) configurado(s) nesta área.
                    </p>
                  </div>
                  {!mostrarNovoItemDaArea && !itemEmEdicaoDaArea ? (
                    <Link
                      href={buildPathWithParams(
                        new URLSearchParams({
                          editAreaId: String(areaEmEdicao.id),
                          newDailyItem: "true"
                        })
                      )}
                      className="btn-primary shrink-0"
                      scroll={false}
                    >
                      Adicionar item/local
                    </Link>
                  ) : null}
                </div>

                {mostrarNovoItemDaArea ? (
                  <form
                    action={createDailyItemConfigAction}
                    className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 md:grid-cols-2"
                  >
                    <input type="hidden" name="returnTo" value={areaModalReturnTo} />
                    <input type="hidden" name="editAreaId" value={String(areaEmEdicao.id)} />
                    <input type="hidden" name="areaId" value={String(areaEmEdicao.id)} />
                    <input type="hidden" name="newDailyItem" value="true" />

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 md:col-span-2">
                      Novo item/local diário
                    </h4>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Ordem *
                      <input
                        type="number"
                        min={1}
                        name="ordem"
                        defaultValue={getDraftValue(
                          params,
                          "ordem",
                          String(areaEmEdicao.itens.length + 1)
                        )}
                        required
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Status
                      <select
                        name="ativo"
                        defaultValue={getDraftBoolean(params, "ativo", true) ? "true" : "false"}
                        className={INPUT_CLASS}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                      Item/local a limpar *
                      <input
                        type="text"
                        name="descricao"
                        required
                        defaultValue={getDraftValue(params, "descricao", "")}
                        className={INPUT_CLASS}
                        placeholder="Ex.: Prateleiras, piso, portas, rodapés"
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Produto utilizado
                      <input
                        type="text"
                        name="produtoUtilizado"
                        defaultValue={getDraftValue(params, "produtoUtilizado", "")}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Setor responsável
                      <input
                        type="text"
                        name="setorResponsavel"
                        defaultValue={getDraftValue(params, "setorResponsavel", "")}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                      Funcionário responsável
                      <input
                        type="text"
                        name="funcionarioResponsavel"
                        defaultValue={getDraftValue(params, "funcionarioResponsavel", "")}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <div className="btn-group md:col-span-2">
                      <button type="submit" className="btn-primary">
                        Salvar item/local
                      </button>
                      <Link href={areaModalReturnTo} className="btn-secondary" scroll={false}>
                        Cancelar
                      </Link>
                    </div>
                  </form>
                ) : null}

                {itemEmEdicaoDaArea ? (
                  <form
                    action={updateDailyItemConfigAction}
                    className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 md:grid-cols-2"
                  >
                    <input type="hidden" name="returnTo" value={areaModalReturnTo} />
                    <input type="hidden" name="editAreaId" value={String(areaEmEdicao.id)} />
                    <input type="hidden" name="dailyItemId" value={String(itemEmEdicaoDaArea.id)} />
                    <input type="hidden" name="areaId" value={String(areaEmEdicao.id)} />

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 md:col-span-2">
                      Editar item/local
                    </h4>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Ordem *
                      <input
                        type="number"
                        min={1}
                        name="ordem"
                        required
                        defaultValue={getDraftValue(
                          params,
                          "ordem",
                          String(itemEmEdicaoDaArea.ordem)
                        )}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Status
                      <select
                        name="ativo"
                        defaultValue={
                          getDraftBoolean(params, "ativo", itemEmEdicaoDaArea.ativo)
                            ? "true"
                            : "false"
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                      Item/local a limpar *
                      <input
                        type="text"
                        name="descricao"
                        required
                        defaultValue={getDraftValue(
                          params,
                          "descricao",
                          itemEmEdicaoDaArea.descricao
                        )}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Produto utilizado
                      <input
                        type="text"
                        name="produtoUtilizado"
                        defaultValue={getDraftValue(
                          params,
                          "produtoUtilizado",
                          itemEmEdicaoDaArea.produtoUtilizado ?? ""
                        )}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Setor responsável
                      <input
                        type="text"
                        name="setorResponsavel"
                        defaultValue={getDraftValue(
                          params,
                          "setorResponsavel",
                          itemEmEdicaoDaArea.setorResponsavel ?? ""
                        )}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                      Funcionário responsável
                      <input
                        type="text"
                        name="funcionarioResponsavel"
                        defaultValue={getDraftValue(
                          params,
                          "funcionarioResponsavel",
                          itemEmEdicaoDaArea.funcionarioResponsavel ?? ""
                        )}
                        className={INPUT_CLASS}
                      />
                    </label>

                    <div className="btn-group md:col-span-2">
                      <button type="submit" className="btn-primary">
                        Salvar item/local
                      </button>
                      <Link href={areaModalReturnTo} className="btn-secondary" scroll={false}>
                        Cancelar
                      </Link>
                    </div>
                  </form>
                ) : null}

                <div className="mt-4">
                  {areaEmEdicao.itens.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Nenhum item/local cadastrado para esta área.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {areaEmEdicao.itens.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Ordem {item.ordem} - {item.descricao}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {item.ativo ? "Ativo" : "Inativo"}
                              </p>
                              <div className="mt-2 grid gap-1 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                                <p>
                                  Produto: <strong>{item.produtoUtilizado || "-"}</strong>
                                </p>
                                <p>
                                  Setor: <strong>{item.setorResponsavel || "-"}</strong>
                                </p>
                                <p>
                                  Funcionário: <strong>{item.funcionarioResponsavel || "-"}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="btn-group lg:justify-end">
                              <Link
                                href={buildPathWithParams(
                                  new URLSearchParams({
                                    editAreaId: String(areaEmEdicao.id),
                                    editDailyItemId: String(item.id)
                                  })
                                )}
                                className="btn-action"
                                scroll={false}
                              >
                                Editar
                              </Link>
                              <Link
                                href={buildPathWithParams(
                                  new URLSearchParams({
                                    editAreaId: String(areaEmEdicao.id),
                                    deleteDailyItemId: String(item.id)
                                  })
                                )}
                                className="btn-danger"
                                scroll={false}
                              >
                                Excluir
                              </Link>
                              <form action={toggleDailyItemConfigStatusAction}>
                                <input type="hidden" name="returnTo" value={areaModalReturnTo} />
                                <input type="hidden" name="dailyItemId" value={String(item.id)} />
                                <input
                                  type="hidden"
                                  name="ativo"
                                  value={item.ativo ? "false" : "true"}
                                />
                                <button type="submit" className="btn-secondary">
                                  {item.ativo ? "Inativar" : "Ativar"}
                                </button>
                              </form>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {areaParaExcluir ? (
        <ActionModal
          title="Excluir área do plano diário"
          description={
            <div className="space-y-2">
              <p>
                Área selecionada: <strong>{areaParaExcluir.nome}</strong>
              </p>
              {areaParaExcluirHistoricoReal > 0 ? (
                <p>
                  Esta área possui histórico de execução. Para preservar a auditoria, ela será
                  removida das rotinas futuras, mas o histórico antigo será preservado.
                </p>
              ) : areaParaExcluirItemIds.length > 0 ? (
                <p>
                  Esta área possui itens cadastrados vinculados. Deseja excluir a área e todos os
                  itens vinculados?
                </p>
              ) : (
                <p>Deseja realmente excluir esta área do plano diário?</p>
              )}
            </div>
          }
          cancelHref={PAGE_PATH}
        >
          <form action={deleteDailyAreaConfigAction}>
            <input type="hidden" name="returnTo" value={PAGE_PATH} />
            <input type="hidden" name="areaId" value={String(areaParaExcluir.id)} />
            <ModalActions>
              <Link href={PAGE_PATH} className="btn-secondary" scroll={false}>
                Cancelar
              </Link>
              <button type="submit" className="btn-danger">
                {areaParaExcluirHistoricoReal > 0
                  ? "Remover das rotinas futuras"
                  : areaParaExcluirItemIds.length > 0
                    ? "Excluir área e itens"
                    : "Excluir área"}
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {itemParaExcluir ? (
        <ActionModal
          title="Excluir item/local do plano diário"
          description={
            <p>
              Deseja realmente excluir <strong>{itemParaExcluir.descricao}</strong> da área{" "}
              <strong>{itemParaExcluir.areaNome}</strong>?
            </p>
          }
          cancelHref={areaEmEdicao ? areaModalReturnTo : PAGE_PATH}
        >
          <form action={deleteDailyItemConfigAction}>
            <input
              type="hidden"
              name="returnTo"
              value={areaEmEdicao ? areaModalReturnTo : PAGE_PATH}
            />
            <input type="hidden" name="dailyItemId" value={String(itemParaExcluir.id)} />
            <ModalActions>
              <Link
                href={areaEmEdicao ? areaModalReturnTo : PAGE_PATH}
                className="btn-secondary"
                scroll={false}
              >
                Cancelar
              </Link>
              <button type="submit" className="btn-danger">
                Excluir
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
