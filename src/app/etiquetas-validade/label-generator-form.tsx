"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateEtiquetaAction } from "./actions";
import { UNIT_OPTIONS } from "./constants";

const INPUT_CLASS = "bpma-input";
const MANUAL_ITEM_VALUE = "__manual__";

export type LabelItemOption = {
  id: number;
  nome: string;
  classificacaoNome: string;
  validadeDias: number;
  unidadeMedidaPadrao: string;
};

type LabelGeneratorFormProps = {
  items: LabelItemOption[];
  responsavelNome: string;
  defaultDate: string;
  returnTo: string;
  resetKey?: string;
  resetOnSuccess?: boolean;
};

function addDaysToDateInput(dateInput: string, days: number): string {
  const [year, month, day] = dateInput.split("-").map((value) => Number(value));
  if (!year || !month || !day || days <= 0) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function LabelGeneratorForm({
  items,
  responsavelNome,
  defaultDate,
  returnTo,
  resetKey = "",
  resetOnSuccess = false
}: LabelGeneratorFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dataManipulacao, setDataManipulacao] = useState(defaultDate);
  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const [marcaFornecedor, setMarcaFornecedor] = useState(
    ""
  );
  const [quantidade, setQuantidade] = useState("");
  const [nomeItemManual, setNomeItemManual] = useState("");
  const [classificacaoManual, setClassificacaoManual] = useState("");
  const [unidadeMedidaManual, setUnidadeMedidaManual] = useState("");
  const [dataValidadeManual, setDataValidadeManual] = useState("");
  const isManualMode = selectedItemId === MANUAL_ITEM_VALUE;
  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setSelectedItemId("");
    setDataManipulacao(defaultDate);
    setMarcaFornecedor("");
    setQuantidade("");
    setNomeItemManual("");
    setClassificacaoManual("");
    setUnidadeMedidaManual("");
    setDataValidadeManual("");
  }, [defaultDate]);
  const dataValidadePreview = selectedItem
    ? addDaysToDateInput(dataManipulacao, selectedItem.validadeDias)
    : "";
  const unidadeSelecionada = isManualMode
    ? unidadeMedidaManual
    : selectedItem?.unidadeMedidaPadrao ?? "";
  const generationBlocked = isManualMode
    ? !nomeItemManual.trim() ||
      !classificacaoManual.trim() ||
      !unidadeMedidaManual ||
      !dataValidadeManual
    : items.length === 0 || !selectedItem || !dataValidadePreview;

  useEffect(() => {
    if (resetKey && resetOnSuccess) {
      resetForm();
    }
  }, [resetKey, resetOnSuccess, resetForm]);

  return (
    <form
      ref={formRef}
      action={generateEtiquetaAction}
      className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="modoLivre" value={isManualMode ? "true" : "false"} />

      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Item/produto *
        <select
          name="itemId"
          value={selectedItemId}
          onChange={(event) => {
            const nextId = event.target.value;
            setSelectedItemId(nextId);
            setQuantidade("");
            setNomeItemManual("");
            setClassificacaoManual("");
            setUnidadeMedidaManual("");
            setDataValidadeManual("");
          }}
          required
          className={INPUT_CLASS}
        >
          <option value="">
            {items.length === 0 ? "Cadastre um item ativo antes de gerar" : "Selecione"}
          </option>
          <option value={MANUAL_ITEM_VALUE}>Item livre / manual</option>
          {items.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.nome}
            </option>
          ))}
        </select>
      </label>

      {isManualMode ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 md:col-span-2">
          Use o modo livre apenas para situações pontuais em que o item ou a classificação ainda não estejam cadastrados.
        </p>
      ) : null}

      {isManualMode ? (
        <>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Nome do item/produto *
            <input
              type="text"
              name="nomeItemManual"
              value={nomeItemManual}
              onChange={(event) => setNomeItemManual(event.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Classificação manual *
            <input
              type="text"
              name="classificacaoManual"
              value={classificacaoManual}
              onChange={(event) => setClassificacaoManual(event.target.value)}
              required
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Unidade de medida *
            <select
              name="unidadeMedidaManual"
              value={unidadeMedidaManual}
              onChange={(event) => setUnidadeMedidaManual(event.target.value)}
              required
              className={INPUT_CLASS}
            >
              <option value="">Selecione</option>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Classificação
            <input
              type="text"
              value={selectedItem?.classificacaoNome ?? ""}
              readOnly
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade configurada
            <input
              type="text"
              value={selectedItem ? `${selectedItem.validadeDias} dia(s)` : ""}
              readOnly
              className={INPUT_CLASS}
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Unidade padrão
            <input
              type="text"
              value={selectedItem?.unidadeMedidaPadrao ?? ""}
              readOnly
              className={INPUT_CLASS}
            />
          </label>
        </>
      )}

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Data de manipulação *
        <input
          type="date"
          name="dataManipulacao"
          value={dataManipulacao}
          onChange={(event) => setDataManipulacao(event.target.value)}
          required
          className={INPUT_CLASS}
        />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Data de validade
        {isManualMode ? (
          <input
            type="date"
            name="dataValidadeManual"
            value={dataValidadeManual}
            onChange={(event) => setDataValidadeManual(event.target.value)}
            required
            className={INPUT_CLASS}
          />
        ) : (
          <input
            type="date"
            value={dataValidadePreview}
            readOnly
            className={INPUT_CLASS}
          />
        )}
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Responsável
        <input type="text" value={responsavelNome} readOnly className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Quantidade *
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            name="quantidade"
            value={quantidade}
            onChange={(event) => setQuantidade(event.target.value)}
            required
            className={INPUT_CLASS}
          />
          <span className="inline-flex min-h-10 min-w-20 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {unidadeSelecionada || "-"}
          </span>
        </div>
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Marca/fornecedor
        <input
          type="text"
          name="marcaFornecedor"
          value={marcaFornecedor}
          onChange={(event) => setMarcaFornecedor(event.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        SIF
        <input type="text" name="sif" className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Lote
        <input type="text" name="lote" className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-4">
        Observação
        <textarea name="observacao" rows={3} className={INPUT_CLASS} />
      </label>

      {generationBlocked ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 md:col-span-4">
          {items.length === 0
            ? "Cadastre um item ativo ou use Item livre / manual."
            : isManualMode
            ? "Preencha item, classificação, unidade e data de validade para gerar a etiqueta manual."
            : "Selecione um item com classificação e validade configuradas para gerar a etiqueta."}
        </p>
      ) : null}

      <div className="md:col-span-4">
        <button type="submit" className="btn-primary" disabled={generationBlocked}>
          Gerar etiqueta
        </button>
      </div>
    </form>
  );
}
