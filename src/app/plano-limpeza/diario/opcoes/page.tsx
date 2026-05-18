import Link from "next/link";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { prisma } from "@/lib/prisma";

import {
  createDailyAreaConfigAction,
  deleteDailyAreaConfigAction,
  toggleDailyAreaConfigStatusAction,
  updateDailyAreaConfigAction
} from "../../actions";
import { ThemeToggleButton } from "../../theme-toggle-button";
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

function TurnoCheckboxes(props: {
  turnoManhaDefault: boolean;
  turnoTardeDefault: boolean;
  turnoNoiteDefault: boolean;
}) {
  return (
    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
      <p className="font-medium">Turnos da Área *</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="turnoManha" defaultChecked={props.turnoManhaDefault} />
        Manhã
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="turnoTarde" defaultChecked={props.turnoTardeDefault} />
        Tarde
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="turnoNoite" defaultChecked={props.turnoNoiteDefault} />
        Noite
      </label>
    </div>
  );
}

function getTurnosLabel(area: {
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
}): string {
  const labels: string[] = [];
  if (area.turnoManha) labels.push("Manhã");
  if (area.turnoTarde) labels.push("Tarde");
  if (area.turnoNoite) labels.push("Noite");
  return labels.length > 0 ? labels.join(", ") : "Sem Turnos";
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

  const areas = await prisma.planoLimpezaDiarioArea.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }]
  });
  const areaEmEdicao = editAreaId
    ? areas.find((area) => area.id === editAreaId) ?? null
    : null;
  const areaParaExcluir = deleteAreaId
    ? areas.find((area) => area.id === deleteAreaId) ?? null
    : null;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar Plano Diário
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configure áreas e turnos que geram checklist automático diário.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/plano-limpeza/diario" className="btn-secondary">
              Voltar para Diário
            </Link>
            <Link href="/plano-limpeza/diario/historico" className="btn-secondary">
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
            <TurnoCheckboxes
              turnoManhaDefault
              turnoTardeDefault
              turnoNoiteDefault
            />
          </div>

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
                      <strong>Turnos:</strong> {getTurnosLabel(area)}
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
          <section className="bpma-modal-panel max-w-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Editar Área do Plano Diário
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Ajuste a área, os turnos e o detalhamento da limpeza.
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

            <form action={updateDailyAreaConfigAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="returnTo" value={`${PAGE_PATH}?editAreaId=${areaEmEdicao.id}`} />
              <input type="hidden" name="areaId" value={String(areaEmEdicao.id)} />

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

              <div className="md:col-span-2">
                <TurnoCheckboxes
                  turnoManhaDefault={getDraftBoolean(params, "turnoManha", areaEmEdicao.turnoManha)}
                  turnoTardeDefault={getDraftBoolean(params, "turnoTarde", areaEmEdicao.turnoTarde)}
                  turnoNoiteDefault={getDraftBoolean(params, "turnoNoite", areaEmEdicao.turnoNoite)}
                />
              </div>

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
          title="Excluir área do plano diário"
          description={
            <p>
              Deseja realmente excluir a área{" "}
              <strong>{areaParaExcluir.nome}</strong> do plano diário?
            </p>
          }
          cancelHref={PAGE_PATH}
        >
          <form action={deleteDailyAreaConfigAction}>
            <input type="hidden" name="returnTo" value={`${PAGE_PATH}?deleteAreaId=${areaParaExcluir.id}`} />
            <input type="hidden" name="areaId" value={String(areaParaExcluir.id)} />
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
