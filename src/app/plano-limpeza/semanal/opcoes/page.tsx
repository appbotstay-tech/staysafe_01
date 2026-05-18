import Link from "next/link";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { prisma } from "@/lib/prisma";

import {
  createWeeklyAreaConfigAction,
  createWeeklyConfigItemAction,
  deleteWeeklyAreaConfigAction,
  deleteWeeklyConfigItemAction,
  moveWeeklyConfigItemAction,
  toggleWeeklyAreaConfigStatusAction,
  toggleWeeklyConfigItemStatusAction,
  updateWeeklyAreaConfigAction,
  updateWeeklyConfigItemAction
} from "../../actions";
import { WEEKLY_DAY_OPTIONS } from "../../constants";
import { ThemeToggleButton } from "../../theme-toggle-button";
import { getWeeklyDayLabel, parsePositiveInt } from "../../utils";

const PAGE_PATH = "/plano-limpeza/semanal/opcoes";
const CARD_CLASS = "bpma-card";
const INPUT_CLASS = "bpma-input";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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

function AreaFormFields(props: {
  params: SearchParams;
  defaults?: {
    nome: string;
    ordem: number;
    ativo: boolean;
  };
}) {
  const defaults = props.defaults ?? {
    nome: "",
    ordem: 1,
    ativo: true
  };

  return (
    <>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Nome da Área *
        <input
          type="text"
          name="nome"
          required
          defaultValue={getDraftValue(props.params, "nome", defaults.nome)}
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
          defaultValue={getDraftValue(props.params, "ordem", String(defaults.ordem))}
          className={INPUT_CLASS}
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Status
        <select
          name="ativo"
          defaultValue={getDraftBoolean(props.params, "ativo", defaults.ativo) ? "true" : "false"}
          className={INPUT_CLASS}
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </label>
    </>
  );
}

function WeeklyItemFields(props: {
  params: SearchParams;
  areaOptions: string[];
  defaults?: {
    area: string;
    ordem: number;
    oQueLimpar: string;
    qualProduto: string;
    quando: string;
    setorResponsavel: string;
    quem: string;
    ativo: boolean;
  };
}) {
  const defaults = props.defaults ?? {
    area: "",
    ordem: 1,
    oQueLimpar: "",
    qualProduto: "",
    quando: "",
    setorResponsavel: "",
    quem: "",
    ativo: true
  };

  return (
    <>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        O que limpar? *
        <select
          name="area"
          required
          defaultValue={getDraftValue(props.params, "area", defaults.area)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione</option>
          {props.areaOptions.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Ordem *
        <input
          type="number"
          min={1}
          name="ordem"
          required
          defaultValue={getDraftValue(props.params, "ordem", String(defaults.ordem))}
          className={INPUT_CLASS}
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Item/local específico *
        <input
          type="text"
          name="oQueLimpar"
          required
          defaultValue={getDraftValue(props.params, "oQueLimpar", defaults.oQueLimpar)}
          className={INPUT_CLASS}
          placeholder="Ex.: prateleiras, piso, portas, rodapés"
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Qual produto usar? *
        <input
          type="text"
          name="qualProduto"
          required
          defaultValue={getDraftValue(props.params, "qualProduto", defaults.qualProduto)}
          className={INPUT_CLASS}
          placeholder="Ex.: Oasis Pro Peroxide + Álcool A&B"
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Quando? *
        <select
          name="quando"
          required
          defaultValue={getDraftValue(props.params, "quando", defaults.quando)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione</option>
          {WEEKLY_DAY_OPTIONS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Qual setor responsável?
        <input
          type="text"
          name="setorResponsavel"
          defaultValue={getDraftValue(props.params, "setorResponsavel", defaults.setorResponsavel)}
          className={INPUT_CLASS}
          placeholder="Ex.: A&B, Cozinha, Almoxarifado"
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Funcionário responsável? *
        <input
          type="text"
          name="quem"
          required
          defaultValue={getDraftValue(props.params, "quem", defaults.quem)}
          className={INPUT_CLASS}
          placeholder="Nome ou equipe responsável"
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Status
        <select
          name="ativo"
          defaultValue={getDraftBoolean(props.params, "ativo", defaults.ativo) ? "true" : "false"}
          className={INPUT_CLASS}
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </label>
    </>
  );
}

export default async function PlanoLimpezaSemanalOpcoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editWeeklyAreaId = parsePositiveInt(firstParam(params.editWeeklyAreaId));
  const deleteWeeklyAreaId = parsePositiveInt(firstParam(params.deleteWeeklyAreaId));
  const editItemId = parsePositiveInt(firstParam(params.editItemId));
  const deleteItemId = parsePositiveInt(firstParam(params.deleteItemId));

  const [areas, itens] = await Promise.all([
    prisma.planoLimpezaSemanalArea.findMany({
      where: { excluidoEm: null },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.planoLimpezaSemanalItem.findMany({
      where: { excluidoEm: null },
      orderBy: [{ area: "asc" }, { ordem: "asc" }, { oQueLimpar: "asc" }]
    })
  ]);

  const activeAreaOptions = areas
    .filter((area) => area.ativo)
    .map((area) => area.nome);
  const allAreaOptions = Array.from(
    new Set([...areas.map((area) => area.nome), ...itens.map((item) => item.area)])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const areaEmEdicao = editWeeklyAreaId
    ? areas.find((area) => area.id === editWeeklyAreaId) ?? null
    : null;
  const areaParaExcluir = deleteWeeklyAreaId
    ? areas.find((area) => area.id === deleteWeeklyAreaId) ?? null
    : null;
  const itemEmEdicao = editItemId
    ? itens.find((item) => item.id === editItemId) ?? null
    : null;
  const itemParaExcluir = deleteItemId
    ? itens.find((item) => item.id === deleteItemId) ?? null
    : null;
  const quantidadeItensDaAreaParaExcluir = areaParaExcluir
    ? itens.filter((item) => item.area === areaParaExcluir.nome).length
    : 0;

  const itemEditAreaOptions = itemEmEdicao
    ? Array.from(new Set([...activeAreaOptions, itemEmEdicao.area])).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      )
    : activeAreaOptions;

  const itensPorArea = new Map<string, typeof itens>();
  for (const area of allAreaOptions) {
    itensPorArea.set(
      area,
      itens
        .filter((item) => item.area === area)
        .sort((a, b) => {
          if (a.ordem !== b.ordem) {
            return a.ordem - b.ordem;
          }
          return a.oQueLimpar.localeCompare(b.oQueLimpar, "pt-BR");
        })
    );
  }

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar Plano Semanal
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Cadastre áreas e itens semanais que orientam a execução da rotina.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/plano-limpeza/semanal" className="btn-secondary">
              Voltar para Semanal
            </Link>
            <Link href="/plano-limpeza/semanal/historico" className="btn-secondary">
              Histórico Completo
            </Link>
            <ThemeToggleButton />
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
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Nova Área Semanal
        </h2>
        <form action={createWeeklyAreaConfigAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="returnTo" value={PAGE_PATH} />
          <AreaFormFields
            params={params}
            defaults={{ nome: "", ordem: areas.length + 1, ativo: true }}
          />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Adicionar Área
            </button>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Áreas Semanais
        </h2>

        {areas.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma área semanal cadastrada.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {areas.map((area) => (
              <li key={area.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex h-full flex-col justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {area.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ordem {area.ordem} • {area.ativo ? "Ativa" : "Inativa"}
                    </p>
                  </div>
                  <div className="btn-group">
                    <Link href={`${PAGE_PATH}?editWeeklyAreaId=${area.id}`} className="btn-action" scroll={false}>
                      Editar
                    </Link>
                    <Link href={`${PAGE_PATH}?deleteWeeklyAreaId=${area.id}`} className="btn-danger" scroll={false}>
                      Excluir
                    </Link>
                    <form action={toggleWeeklyAreaConfigStatusAction}>
                      <input type="hidden" name="returnTo" value={PAGE_PATH} />
                      <input type="hidden" name="weeklyAreaId" value={String(area.id)} />
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
        )}
      </section>

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Novo Item Semanal
        </h2>
        <form action={createWeeklyConfigItemAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="returnTo" value={PAGE_PATH} />
          <WeeklyItemFields
            params={params}
            areaOptions={activeAreaOptions}
            defaults={{
              area: "",
              ordem: 1,
              oQueLimpar: "",
              qualProduto: "",
              quando: "",
              setorResponsavel: "",
              quem: "",
              ativo: true
            }}
          />
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={activeAreaOptions.length === 0}>
              Adicionar Item
            </button>
          </div>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Itens por Área
        </h2>

        <div className="space-y-4">
          {allAreaOptions.map((area) => {
            const itensArea = itensPorArea.get(area) ?? [];

            return (
              <article key={area} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{area}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {itensArea.length} item(ns)
                  </p>
                </div>

                {itensArea.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhum item cadastrado para esta área.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {itensArea.map((item, index) => (
                      <li key={item.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Ordem {item.ordem} • {item.oQueLimpar}
                        </p>
                        <dl className="mt-2 grid gap-1 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-2">
                          <div>
                            <dt className="font-medium">Produto</dt>
                            <dd>{item.qualProduto}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Quando</dt>
                            <dd>{getWeeklyDayLabel(item.quando)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Setor responsável</dt>
                            <dd>{item.setorResponsavel || "-"}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Funcionário responsável</dt>
                            <dd>{item.quem}</dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {item.ativo ? "Ativo" : "Inativo"}
                        </p>

                        <div className="btn-group mt-3">
                          <Link href={`${PAGE_PATH}?editItemId=${item.id}`} className="btn-action" scroll={false}>
                            Editar
                          </Link>
                          <Link href={`${PAGE_PATH}?deleteItemId=${item.id}`} className="btn-danger" scroll={false}>
                            Excluir
                          </Link>
                          <form action={moveWeeklyConfigItemAction}>
                            <input type="hidden" name="returnTo" value={PAGE_PATH} />
                            <input type="hidden" name="itemId" value={String(item.id)} />
                            <input type="hidden" name="direction" value="up" />
                            <button type="submit" className="btn-secondary" disabled={index === 0}>
                              Subir
                            </button>
                          </form>
                          <form action={moveWeeklyConfigItemAction}>
                            <input type="hidden" name="returnTo" value={PAGE_PATH} />
                            <input type="hidden" name="itemId" value={String(item.id)} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              className="btn-secondary"
                              disabled={index === itensArea.length - 1}
                            >
                              Descer
                            </button>
                          </form>
                          <form action={toggleWeeklyConfigItemStatusAction}>
                            <input type="hidden" name="returnTo" value={PAGE_PATH} />
                            <input type="hidden" name="itemId" value={String(item.id)} />
                            <input type="hidden" name="ativo" value={item.ativo ? "false" : "true"} />
                            <button type="submit" className="btn-secondary">
                              {item.ativo ? "Inativar" : "Ativar"}
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {areaEmEdicao ? (
        <div className="bpma-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar área semanal">
          <section className="bpma-modal-panel max-w-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Editar Área Semanal
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Ajuste nome, ordem e status da área usada pelos itens semanais.
                </p>
              </div>
              <Link href={PAGE_PATH} className="btn-secondary shrink-0" scroll={false}>
                Fechar
              </Link>
            </div>
            {feedback && feedbackType === "error" ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {feedback}
              </p>
            ) : null}

            <form action={updateWeeklyAreaConfigAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="returnTo" value={`${PAGE_PATH}?editWeeklyAreaId=${areaEmEdicao.id}`} />
              <input type="hidden" name="weeklyAreaId" value={String(areaEmEdicao.id)} />
              <AreaFormFields
                params={params}
                defaults={{
                  nome: areaEmEdicao.nome,
                  ordem: areaEmEdicao.ordem,
                  ativo: areaEmEdicao.ativo
                }}
              />
              <div className="btn-group md:col-span-2">
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
                <Link href={PAGE_PATH} className="btn-secondary" scroll={false}>
                  Cancelar
                </Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {itemEmEdicao ? (
        <div className="bpma-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar item do plano semanal">
          <section className="bpma-modal-panel max-w-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Editar Item do Plano Semanal
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Ajuste área, produto, frequência, setor e responsável do item.
                </p>
              </div>
              <Link href={PAGE_PATH} className="btn-secondary shrink-0" scroll={false}>
                Fechar
              </Link>
            </div>
            {feedback && feedbackType === "error" ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {feedback}
              </p>
            ) : null}

            <form action={updateWeeklyConfigItemAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="returnTo" value={`${PAGE_PATH}?editItemId=${itemEmEdicao.id}`} />
              <input type="hidden" name="itemId" value={String(itemEmEdicao.id)} />
              <WeeklyItemFields
                params={params}
                areaOptions={itemEditAreaOptions}
                defaults={{
                  area: itemEmEdicao.area,
                  ordem: itemEmEdicao.ordem,
                  oQueLimpar: itemEmEdicao.oQueLimpar,
                  qualProduto: itemEmEdicao.qualProduto,
                  quando: itemEmEdicao.quando,
                  setorResponsavel: itemEmEdicao.setorResponsavel ?? "",
                  quem: itemEmEdicao.quem,
                  ativo: itemEmEdicao.ativo
                }}
              />
              <div className="btn-group md:col-span-2">
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
                <Link href={PAGE_PATH} className="btn-secondary" scroll={false}>
                  Cancelar
                </Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {areaParaExcluir ? (
        <ActionModal
          title="Excluir área do plano semanal"
          description={
            quantidadeItensDaAreaParaExcluir > 0 ? (
              <p>
                Esta área possui {quantidadeItensDaAreaParaExcluir} item(ns) cadastrado(s)
                vinculado(s). Deseja excluir a área e todos os itens vinculados quando não houver
                histórico real? Se houver histórico, a área será removida das rotinas futuras e a
                auditoria será preservada.
              </p>
            ) : (
              <p>
                Deseja realmente excluir a área{" "}
                <strong>{areaParaExcluir.nome}</strong> do plano semanal?
              </p>
            )
          }
          cancelHref={PAGE_PATH}
        >
          <form action={deleteWeeklyAreaConfigAction}>
            <input type="hidden" name="returnTo" value={PAGE_PATH} />
            <input type="hidden" name="weeklyAreaId" value={String(areaParaExcluir.id)} />
            <ModalActions>
              <button type="submit" className="btn-danger">
                {quantidadeItensDaAreaParaExcluir > 0 ? "Excluir área e itens" : "Excluir"}
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {itemParaExcluir ? (
        <ActionModal
          title="Excluir item do plano semanal"
          description={
            <p>
              Deseja realmente excluir o item{" "}
              <strong>{itemParaExcluir.oQueLimpar}</strong> do plano semanal?
            </p>
          }
          cancelHref={PAGE_PATH}
        >
          <form action={deleteWeeklyConfigItemAction}>
            <input type="hidden" name="returnTo" value={PAGE_PATH} />
            <input type="hidden" name="itemId" value={String(itemParaExcluir.id)} />
            <ModalActions>
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
