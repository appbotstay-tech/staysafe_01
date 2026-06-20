import {
  CategoriaEquipamentoTemperatura,
  ModuloDocumento,
  StatusTemperaturaEquipamento,
  TipoOpcaoTemperaturaEquipamento,
  TurnoTemperaturaEquipamento
} from "@prisma/client";
import Link from "next/link";

import { ModuleHeaderTextSettings } from "@/components/documentos/module-header-text-settings";
import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { prisma } from "@/lib/prisma";

import {
  createCatalogOptionAction,
  createCategoryParameterAction,
  createCategoryRuleAction,
  deleteCategoryRuleAction,
  toggleCatalogOptionStatusAction,
  toggleCategoryRuleStatusAction,
  updateCatalogOptionAction,
  updateCategoryParameterAction,
  updateCategoryRuleAction
} from "../actions";
import {
  formatTemperatureRange,
  getCategoriaLabel,
  getStatusLabel,
  parsePositiveInt
} from "../utils";

const PAGE_PATH = "/controle-temperatura-equipamentos/opcoes";
const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";

const EQUIPMENT_SHIFT_OPTIONS = [
  { value: TurnoTemperaturaEquipamento.MANHA, label: "Manhã" },
  { value: TurnoTemperaturaEquipamento.TARDE, label: "Tarde" }
];

const TEMPERATURE_CATEGORY_OPTIONS = [
  {
    value: CategoriaEquipamentoTemperatura.REFRIGERACAO,
    label: "Refrigeração"
  },
  {
    value: CategoriaEquipamentoTemperatura.CONGELAMENTO,
    label: "Congelamento"
  },
  {
    value: CategoriaEquipamentoTemperatura.QUENTE,
    label: "Quente"
  }
];

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function categoryLabel(
  categoria: CategoriaEquipamentoTemperatura,
  nome?: string
): string {
  return nome || getCategoriaLabel(categoria);
}

function equipmentShiftLabels(option: {
  turnoManha: boolean;
  turnoTarde: boolean;
}): string {
  const labels = [
    option.turnoManha ? "Manhã" : null,
    option.turnoTarde ? "Tarde" : null
  ].filter((label): label is string => label !== null);

  return labels.length > 0 ? labels.join(" e ") : "-";
}

type CategoryParameterDefaults = {
  nome?: string;
  temperaturaIdealMin?: number | null;
  temperaturaIdealMax?: number | null;
  temperaturaAlertaMin?: number | null;
  temperaturaAlertaMax?: number | null;
  temperaturaCriticaMin?: number | null;
  temperaturaCriticaMax?: number | null;
  acaoIdeal?: string;
  acaoAlerta?: string;
  acaoCritica?: string;
  orientacaoCorretivaPadrao?: string;
  isActive?: boolean;
};

function formatTemperatureFieldValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

function CategoryParameterFields({
  defaults,
  inputClassName
}: {
  defaults?: CategoryParameterDefaults;
  inputClassName: string;
}) {
  return (
    <>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Nome da categoria
        <input
          type="text"
          name="nome"
          required
          defaultValue={defaults?.nome ?? ""}
          placeholder="Ex.: Refrigeração"
          className={inputClassName}
        />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Status
        <select
          name="isActive"
          defaultValue={defaults?.isActive === false ? "false" : "true"}
          className={inputClassName}
        >
          <option value="true">Ativa</option>
          <option value="false">Inativa</option>
        </select>
      </label>

      <fieldset className="grid gap-2 rounded-lg border border-slate-200 p-3 md:col-span-2 md:grid-cols-3 dark:border-slate-700">
        <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Faixas de temperatura
        </legend>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Ideal mín.
          <input
            type="text"
            name="temperaturaIdealMin"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaIdealMin)}
            className={inputClassName}
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Ideal máx.
          <input
            type="text"
            name="temperaturaIdealMax"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaIdealMax)}
            className={inputClassName}
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Alerta mín.
          <input
            type="text"
            name="temperaturaAlertaMin"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaAlertaMin)}
            className={inputClassName}
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Alerta máx.
          <input
            type="text"
            name="temperaturaAlertaMax"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaAlertaMax)}
            className={inputClassName}
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Crítica mín.
          <input
            type="text"
            name="temperaturaCriticaMin"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaCriticaMin)}
            className={inputClassName}
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-300">
          Crítica máx.
          <input
            type="text"
            name="temperaturaCriticaMax"
            inputMode="text"
            defaultValue={formatTemperatureFieldValue(defaults?.temperaturaCriticaMax)}
            className={inputClassName}
          />
        </label>
      </fieldset>

      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Ação para faixa ideal
        <textarea
          name="acaoIdeal"
          rows={2}
          required
          defaultValue={defaults?.acaoIdeal ?? ""}
          className={inputClassName}
        />
      </label>
      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Ação para faixa de alerta
        <textarea
          name="acaoAlerta"
          rows={2}
          required
          defaultValue={defaults?.acaoAlerta ?? ""}
          className={inputClassName}
        />
      </label>
      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Ação para faixa crítica
        <textarea
          name="acaoCritica"
          rows={2}
          required
          defaultValue={defaults?.acaoCritica ?? ""}
          className={inputClassName}
        />
      </label>
      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Orientação corretiva padrão
        <textarea
          name="orientacaoCorretivaPadrao"
          rows={2}
          required
          defaultValue={defaults?.orientacaoCorretivaPadrao ?? ""}
          className={inputClassName}
        />
      </label>
    </>
  );
}

export default async function ControleTemperaturaOpcoesPage({
  searchParams
}: PageProps) {
  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editEquipamentoId = parsePositiveInt(firstParam(params.editEquipamentoId));
  const editAcaoId = parsePositiveInt(firstParam(params.editAcaoId));
  const editCategoriaId = parsePositiveInt(firstParam(params.editCategoriaId));
  const editRegraId = parsePositiveInt(firstParam(params.editRegraId));
  const novaRegraCategoriaId = parsePositiveInt(firstParam(params.novaRegraCategoriaId));

  const [options, categorias] = await Promise.all([
    prisma.controleTemperaturaEquipamentoOpcao.findMany({
      orderBy: [{ tipo: "asc" }, { ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.controleTemperaturaCategoriaParametro.findMany({
      include: {
        regras: {
          orderBy: [{ ordem: "asc" }, { id: "asc" }]
        }
      },
      orderBy: { categoria: "asc" }
    })
  ]);

  const equipamentos = options.filter(
    (option) => option.tipo === TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO
  );
  const equipamentoEmEdicao = editEquipamentoId
    ? equipamentos.find((option) => option.id === editEquipamentoId) ?? null
    : null;
  const acoesCorretivas = options.filter(
    (option) => option.tipo === TipoOpcaoTemperaturaEquipamento.ACAO_CORRETIVA
  );
  const categoriasAtivas = categorias.filter((categoria) => categoria.isActive);
  const categoriaEmEdicao = editCategoriaId
    ? categorias.find((categoria) => categoria.id === editCategoriaId) ?? null
    : null;
  const categoriasCadastradas = new Set(
    categorias.map((categoria) => categoria.categoria)
  );
  const categoriasDisponiveisParaCriacao = TEMPERATURE_CATEGORY_OPTIONS.filter(
    (categoria) => !categoriasCadastradas.has(categoria.value)
  );
  const modalError = feedback && feedbackType === "error" ? feedback : "";

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar Opções
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Cadastre equipamentos, ações corretivas e regras de temperatura por categoria.
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

      <ModuleHeaderTextSettings
        modulo={ModuloDocumento.CONTROLE_TEMPERATURA}
        returnTo={PAGE_PATH}
      />

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Categorias de Equipamento
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Cadastre os parâmetros da categoria antes de vincular equipamentos.
            </p>
          </div>
        </div>

        {categoriasDisponiveisParaCriacao.length > 0 ? (
          <form
            action={createCategoryParameterAction}
            className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-2 dark:bg-slate-800"
          >
            <input type="hidden" name="returnTo" value={PAGE_PATH} />

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Categoria
              <select name="categoria" required className={INPUT_CLASS}>
                {categoriasDisponiveisParaCriacao.map((categoria) => (
                  <option key={categoria.value} value={categoria.value}>
                    {categoria.label}
                  </option>
                ))}
              </select>
            </label>

            <CategoryParameterFields inputClassName={INPUT_CLASS} />

            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">
                Criar categoria
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 space-y-3">
          {categorias.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Nenhuma categoria de temperatura cadastrada. Crie a primeira categoria para
              habilitar o cadastro dos equipamentos.
            </div>
          ) : (
            categorias.map((categoria) => {
              const isEditing = categoriaEmEdicao?.id === categoria.id;

              if (isEditing) {
                return (
                  <form
                    key={categoria.id}
                    action={updateCategoryParameterAction}
                    className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-700"
                  >
                    <input type="hidden" name="parameterId" value={categoria.id} />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`${PAGE_PATH}?editCategoriaId=${categoria.id}`}
                    />

                    <div className="md:col-span-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Editar {categoryLabel(categoria.categoria, categoria.nome)}
                      </h3>
                    </div>

                    <CategoryParameterFields
                      defaults={categoria}
                      inputClassName={INPUT_CLASS}
                    />

                    <div className="btn-group md:col-span-2">
                      <button type="submit" className="btn-primary">
                        Salvar categoria
                      </button>
                      <Link href={PAGE_PATH} className="btn-secondary">
                        Cancelar
                      </Link>
                    </div>
                  </form>
                );
              }

              return (
                <article
                  key={categoria.id}
                  className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {categoryLabel(categoria.categoria, categoria.nome)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {categoria.isActive ? "Categoria ativa" : "Categoria inativa"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ideal:{" "}
                        {formatTemperatureRange(
                          categoria.temperaturaIdealMin,
                          categoria.temperaturaIdealMax
                        )}{" "}
                        | Alerta:{" "}
                        {formatTemperatureRange(
                          categoria.temperaturaAlertaMin,
                          categoria.temperaturaAlertaMax
                        )}
                      </p>
                    </div>

                    <Link
                      href={`${PAGE_PATH}?editCategoriaId=${categoria.id}`}
                      className="btn-action"
                    >
                      Editar
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className={CARD_CLASS}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Equipamentos</h2>
            <form action={createCatalogOptionAction} className="mt-3 grid gap-2">
              <input type="hidden" name="tipo" value={TipoOpcaoTemperaturaEquipamento.EQUIPAMENTO} />
              <input type="hidden" name="returnTo" value={PAGE_PATH} />

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome do Equipamento
                <input type="text" name="nome" required placeholder="Ex.: Câmara Fria de Laticínios" className={INPUT_CLASS} />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Categoria
                <select
                  name="categoriaEquipamento"
                  required
                  defaultValue={categoriasAtivas[0]?.categoria ?? ""}
                  className={INPUT_CLASS}
                >
                  {categoriasAtivas.length === 0 ? (
                    <option value="" disabled>
                      Crie uma categoria ativa antes de cadastrar equipamentos
                    </option>
                  ) : null}
                  {categoriasAtivas.map((categoria) => (
                    <option key={categoria.id} value={categoria.categoria}>
                      {categoryLabel(categoria.categoria, categoria.nome)}
                    </option>
                  ))}
                </select>
              </label>
              {categoriasAtivas.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  Crie e ative uma categoria antes de salvar o primeiro equipamento.
                </p>
              ) : null}

              <fieldset className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <legend className="px-1 font-medium">Turnos de conferência</legend>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Selecione em quais turnos este equipamento deve gerar pendência de conferência de temperatura.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {EQUIPMENT_SHIFT_OPTIONS.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="turnosConferencia"
                        value={option.value}
                        defaultChecked
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <button type="submit" className="btn-primary">Adicionar</button>
              </div>
            </form>

            <ul className="mt-4 space-y-2">
              {equipamentos.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum equipamento cadastrado.
                </li>
              ) : (
              equipamentos.map((option) => {
                const categoria = option.categoriaEquipamento
                  ? categorias.find((item) => item.categoria === option.categoriaEquipamento)
                  : null;

                return (
                  <li key={option.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{option.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {option.categoriaEquipamento
                            ? categoryLabel(option.categoriaEquipamento, categoria?.nome)
                            : "Sem categoria"}
                          {option.ativo ? " • Ativo" : " • Inativo"}
                          {" • Turnos: "}
                          {equipmentShiftLabels(option)}
                        </p>
                      </div>

                      <div className="btn-group">
                        <Link href={`${PAGE_PATH}?editEquipamentoId=${option.id}`} scroll={false} className="btn-action">
                          Editar
                        </Link>
                        <form action={toggleCatalogOptionStatusAction}>
                          <input type="hidden" name="optionId" value={option.id} />
                          <input type="hidden" name="ativo" value={option.ativo ? "false" : "true"} />
                          <input type="hidden" name="returnTo" value={PAGE_PATH} />
                          <button type="submit" className="btn-secondary">
                            {option.ativo ? "Inativar" : "Ativar"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ações Corretivas</h2>

            <form action={createCatalogOptionAction} className="mt-3 grid gap-2">
              <input type="hidden" name="tipo" value={TipoOpcaoTemperaturaEquipamento.ACAO_CORRETIVA} />
              <input type="hidden" name="returnTo" value={PAGE_PATH} />

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome da Ação Corretiva
                <input type="text" name="nome" required placeholder="Ex.: Acionar manutenção" className={INPUT_CLASS} />
              </label>

              <div>
                <button type="submit" className="btn-primary">Adicionar</button>
              </div>
            </form>

            <ul className="mt-4 space-y-2">
              {acoesCorretivas.map((option) => {
                const isEditing = editAcaoId === option.id;

                if (isEditing) {
                  return (
                    <li key={option.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <form action={updateCatalogOptionAction} className="grid gap-2">
                        <input type="hidden" name="optionId" value={option.id} />
                        <input type="hidden" name="returnTo" value={PAGE_PATH} />

                        <label className="text-sm text-slate-700 dark:text-slate-200">
                          Nome
                          <input type="text" name="nome" required defaultValue={option.nome} className={INPUT_CLASS} />
                        </label>

                        <div className="btn-group">
                          <button type="submit" className="btn-primary">Salvar</button>
                          <Link href={PAGE_PATH} className="btn-secondary">Cancelar</Link>
                        </div>
                      </form>
                    </li>
                  );
                }

                return (
                  <li key={option.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{option.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {option.ativo ? "Ativo" : "Inativo"}
                        </p>
                      </div>

                      <div className="btn-group">
                        <Link href={`${PAGE_PATH}?editAcaoId=${option.id}`} className="btn-action">
                          Editar
                        </Link>
                        <form action={toggleCatalogOptionStatusAction}>
                          <input type="hidden" name="optionId" value={option.id} />
                          <input type="hidden" name="ativo" value={option.ativo ? "false" : "true"} />
                          <input type="hidden" name="returnTo" value={PAGE_PATH} />
                          <button type="submit" className="btn-secondary">
                            {option.ativo ? "Inativar" : "Ativar"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {equipamentoEmEdicao ? (
        <ActionModal
          title="Editar equipamento"
          cancelHref={PAGE_PATH}
          maxWidthClassName="max-w-2xl"
          description={
            <p>
              Selecione em quais turnos este equipamento deve gerar pendência de conferência de temperatura.
            </p>
          }
        >
          {modalError ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          <form action={updateCatalogOptionAction} className="grid gap-3">
            <input type="hidden" name="optionId" value={equipamentoEmEdicao.id} />
            <input type="hidden" name="returnTo" value={`${PAGE_PATH}?editEquipamentoId=${equipamentoEmEdicao.id}`} />

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome do equipamento
              <input type="text" name="nome" required defaultValue={equipamentoEmEdicao.nome} className={INPUT_CLASS} />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Categoria
              <select
                name="categoriaEquipamento"
                required
                defaultValue={equipamentoEmEdicao.categoriaEquipamento ?? ""}
                className={INPUT_CLASS}
              >
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.categoria}>
                    {categoryLabel(categoria.categoria, categoria.nome)}
                    {categoria.isActive ? "" : " (Inativa)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select name="ativo" defaultValue={equipamentoEmEdicao.ativo ? "true" : "false"} className={INPUT_CLASS}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>

            <fieldset className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <legend className="px-1 font-medium">Turnos de conferência</legend>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Selecione em quais turnos este equipamento deve gerar pendência de conferência de temperatura.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {EQUIPMENT_SHIFT_OPTIONS.map((option) => (
                  <label key={option.value} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="turnosConferencia"
                      value={option.value}
                      defaultChecked={
                        option.value === TurnoTemperaturaEquipamento.MANHA
                          ? equipamentoEmEdicao.turnoManha
                          : equipamentoEmEdicao.turnoTarde
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <ModalActions>
              <Link href={PAGE_PATH} scroll={false} className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Salvar
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Regras de Temperatura por Categoria
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Configure as faixas de temperatura, status e ação corretiva em ordem de prioridade.
        </p>

        <div className="mt-4 space-y-4">
          {categorias.map((categoria) => {
            const mostrarNovaRegra = novaRegraCategoriaId === categoria.id;

            return (
              <article key={categoria.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {categoryLabel(categoria.categoria, categoria.nome)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {categoria.isActive ? "Categoria ativa" : "Categoria inativa"}
                    </p>
                  </div>
                  <div className="btn-group">
                    <Link href={`${PAGE_PATH}?novaRegraCategoriaId=${categoria.id}`} className="btn-primary">
                      Nova Regra
                    </Link>
                  </div>
                </div>

                {mostrarNovaRegra ? (
                  <form action={createCategoryRuleAction} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 dark:bg-slate-800">
                    <input type="hidden" name="categoriaId" value={categoria.id} />
                    <input type="hidden" name="returnTo" value={PAGE_PATH} />
                    <input type="hidden" name="isActive" value="true" />

                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Temperatura Mín.
                      <input type="text" name="temperaturaMin" inputMode="text" className={INPUT_CLASS} />
                    </label>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Temperatura Máx.
                      <input type="text" name="temperaturaMax" inputMode="text" className={INPUT_CLASS} />
                    </label>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Status
                      <select name="status" required className={INPUT_CLASS}>
                        <option value={StatusTemperaturaEquipamento.CONFORME}>Normal</option>
                        <option value={StatusTemperaturaEquipamento.ALERTA}>Alerta</option>
                        <option value={StatusTemperaturaEquipamento.CRITICO}>Crítico</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                      Ação Corretiva
                      <input type="text" name="acaoCorretiva" required className={INPUT_CLASS} />
                    </label>
                    <label className="text-sm text-slate-700 dark:text-slate-200">
                      Ordem
                      <input type="number" name="ordem" min={1} required className={INPUT_CLASS} />
                    </label>

                    <div className="btn-group md:col-span-6">
                      <button type="submit" className="btn-primary">Salvar Regra</button>
                      <Link href={PAGE_PATH} className="btn-secondary">Cancelar</Link>
                    </div>
                  </form>
                ) : null}

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-3 py-2">Ordem</th>
                        <th className="px-3 py-2">Faixa</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 min-w-60">Ação Corretiva</th>
                        <th className="px-3 py-2">Situação</th>
                        <th className="px-3 py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {categoria.regras.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                            Nenhuma regra cadastrada para esta categoria.
                          </td>
                        </tr>
                      ) : (
                        categoria.regras.map((regra) => {
                          const isEditing = editRegraId === regra.id;

                          return (
                            <tr key={regra.id}>
                              <td className="px-3 py-2">{regra.ordem}</td>
                              <td className="px-3 py-2">{formatTemperatureRange(regra.temperaturaMin, regra.temperaturaMax)}</td>
                              <td className="px-3 py-2">{getStatusLabel(regra.status)}</td>
                              <td className="px-3 py-2 max-w-64 whitespace-normal break-words">{regra.acaoCorretiva}</td>
                              <td className="px-3 py-2">{regra.isActive ? "Ativa" : "Inativa"}</td>
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <form action={updateCategoryRuleAction} className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                    <input type="hidden" name="regraId" value={regra.id} />
                                    <input type="hidden" name="returnTo" value={PAGE_PATH} />

                                    <div className="grid gap-2 md:grid-cols-3">
                                      <label className="text-xs text-slate-600 dark:text-slate-300">
                                        Temp. Mín.
                                        <input type="text" name="temperaturaMin" defaultValue={regra.temperaturaMin ?? ""} className={INPUT_CLASS} />
                                      </label>
                                      <label className="text-xs text-slate-600 dark:text-slate-300">
                                        Temp. Máx.
                                        <input type="text" name="temperaturaMax" defaultValue={regra.temperaturaMax ?? ""} className={INPUT_CLASS} />
                                      </label>
                                      <label className="text-xs text-slate-600 dark:text-slate-300">
                                        Ordem
                                        <input type="number" name="ordem" min={1} defaultValue={regra.ordem} className={INPUT_CLASS} />
                                      </label>
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-2">
                                      <label className="text-xs text-slate-600 dark:text-slate-300">
                                        Status
                                        <select name="status" defaultValue={regra.status} className={INPUT_CLASS}>
                                          <option value={StatusTemperaturaEquipamento.CONFORME}>Normal</option>
                                          <option value={StatusTemperaturaEquipamento.ALERTA}>Alerta</option>
                                          <option value={StatusTemperaturaEquipamento.CRITICO}>Crítico</option>
                                        </select>
                                      </label>
                                      <label className="text-xs text-slate-600 dark:text-slate-300">
                                        Situação
                                        <select name="isActive" defaultValue={regra.isActive ? "true" : "false"} className={INPUT_CLASS}>
                                          <option value="true">Ativa</option>
                                          <option value="false">Inativa</option>
                                        </select>
                                      </label>
                                    </div>

                                    <label className="text-xs text-slate-600 dark:text-slate-300">
                                      Ação Corretiva
                                      <input type="text" name="acaoCorretiva" defaultValue={regra.acaoCorretiva} className={INPUT_CLASS} />
                                    </label>

                                    <div className="btn-group">
                                      <button type="submit" className="btn-primary">Salvar</button>
                                      <Link href={PAGE_PATH} className="btn-secondary">Cancelar</Link>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="btn-group">
                                    <Link href={`${PAGE_PATH}?editRegraId=${regra.id}`} className="btn-action">Editar</Link>
                                    <form action={toggleCategoryRuleStatusAction}>
                                      <input type="hidden" name="regraId" value={regra.id} />
                                      <input type="hidden" name="isActive" value={regra.isActive ? "false" : "true"} />
                                      <input type="hidden" name="returnTo" value={PAGE_PATH} />
                                      <button type="submit" className="btn-secondary">
                                        {regra.isActive ? "Inativar" : "Ativar"}
                                      </button>
                                    </form>
                                    <form action={deleteCategoryRuleAction}>
                                      <input type="hidden" name="regraId" value={regra.id} />
                                      <input type="hidden" name="returnTo" value={PAGE_PATH} />
                                      <button type="submit" className="btn-danger">Excluir</button>
                                    </form>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
