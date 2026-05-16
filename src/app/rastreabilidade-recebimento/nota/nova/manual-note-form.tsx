"use client";

import { useActionState } from "react";

import { createManualNoteStateAction } from "../../actions";
import { SIF_INPUT_REQUIRED_MESSAGE } from "../../sif";
import { SifInput } from "../../sif-input";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  invalidField?: string;
};

type ManualNoteFormProps = {
  responsavelLogado: string;
  inputClassName: string;
};

const INITIAL_STATE: ActionState = {
  status: "idle",
  message: ""
};

export function ManualNoteForm({
  responsavelLogado,
  inputClassName
}: ManualNoteFormProps) {
  const [state, formAction] = useActionState(createManualNoteStateAction, INITIAL_STATE);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="returnTo" value="/rastreabilidade-recebimento/nota/nova" />

      {state.status === "error" && state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-2 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {state.message}
        </div>
      ) : null}

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Fornecedor *
        <input type="text" name="fornecedor" required className={inputClassName} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Nota Fiscal *
        <input type="text" name="notaFiscal" required className={inputClassName} />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Produto *
        <input type="text" name="produto" required className={inputClassName} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Lote *
        <input type="text" name="lote" required className={inputClassName} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Data de Fabricação *
        <input type="date" name="dataFabricacao" required className={inputClassName} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Validade *
        <input type="date" name="dataValidade" required className={inputClassName} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        SIF *
        <SifInput
          name="sif"
          list="sif-opcoes-manual"
          className={inputClassName}
          serverError={
            state.invalidField === "sif" ? SIF_INPUT_REQUIRED_MESSAGE : ""
          }
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Temperatura (°C) *
        <input
          type="text"
          name="temperatura"
          required
          inputMode="text"
          className={inputClassName}
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Transporte / Entregador *
        <select name="transporteEntregador" required className={inputClassName}>
          <option value="">Selecione</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Aspecto Sensorial *
        <select name="aspectoSensorial" required className={inputClassName}>
          <option value="">Selecione</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Embalagem *
        <select name="embalagem" required className={inputClassName}>
          <option value="">Selecione</option>
          <option value="CONFORME">Conforme</option>
          <option value="NAO_CONFORME">Não Conforme</option>
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Ação Corretiva
        <input type="text" name="acaoCorretiva" className={inputClassName} />
      </label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Responsável pelo Recebimento
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {responsavelLogado}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Preenchido automaticamente pelo usuário logado.
        </p>
      </div>
      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Observações
        <textarea name="observacoes" rows={3} className={inputClassName} />
      </label>

      <div className="md:col-span-2">
        <button type="submit" className="btn-primary">
          Criar Nota
        </button>
      </div>
      <datalist id="sif-opcoes-manual">
        <option value="NA" />
      </datalist>
    </form>
  );
}
