"use client";

import { useMemo, useState } from "react";

import { generateEtiquetaAction } from "./actions";

const INPUT_CLASS = "bpma-input";

export type LabelItemOption = {
  id: number;
  nome: string;
  classificacaoNome: string;
  validadeDias: number;
  marcaFornecedor: string;
  unidadePadrao: string;
};

type LabelGeneratorFormProps = {
  items: LabelItemOption[];
  responsavelNome: string;
  defaultDate: string;
  returnTo: string;
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
  returnTo
}: LabelGeneratorFormProps) {
  const [selectedItemId, setSelectedItemId] = useState(
    items[0] ? String(items[0].id) : ""
  );
  const [dataManipulacao, setDataManipulacao] = useState(defaultDate);
  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const [marcaFornecedor, setMarcaFornecedor] = useState(
    selectedItem?.marcaFornecedor ?? ""
  );
  const [quantidadePeso, setQuantidadePeso] = useState(selectedItem?.unidadePadrao ?? "");
  const dataValidadePreview = selectedItem
    ? addDaysToDateInput(dataManipulacao, selectedItem.validadeDias)
    : "";
  const generationBlocked = items.length === 0 || !selectedItem || !dataValidadePreview;

  return (
    <form
      action={generateEtiquetaAction}
      className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />

      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Item/produto *
        <select
          name="itemId"
          value={selectedItemId}
          onChange={(event) => {
            const nextId = event.target.value;
            const nextItem = items.find((item) => String(item.id) === nextId) ?? null;
            setSelectedItemId(nextId);
            setMarcaFornecedor(nextItem?.marcaFornecedor ?? "");
            setQuantidadePeso(nextItem?.unidadePadrao ?? "");
          }}
          required
          className={INPUT_CLASS}
        >
          {items.length === 0 ? (
            <option value="">Cadastre um item ativo antes de gerar</option>
          ) : null}
          {items.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.nome}
            </option>
          ))}
        </select>
      </label>

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
        Hora de manipulação
        <input type="time" name="horaManipulacao" className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Data de validade
        <input
          type="date"
          value={dataValidadePreview}
          readOnly
          className={INPUT_CLASS}
        />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Hora de validade
        <input type="time" name="horaValidade" className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Responsável
        <input type="text" value={responsavelNome} readOnly className={INPUT_CLASS} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Quantidade/peso
        <input
          type="text"
          name="quantidadePeso"
          value={quantidadePeso}
          onChange={(event) => setQuantidadePeso(event.target.value)}
          className={INPUT_CLASS}
        />
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
          Classificação sem validade configurada. Cadastre a validade antes de gerar a etiqueta.
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
