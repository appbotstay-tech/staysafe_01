"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { StatusRecebimento } from "@prisma/client";

import { saveNotaItemsStateAction } from "../../actions";
import { ConformidadeBadge } from "../../status-badges";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  invalidRowKey?: string;
};

export type NoteItemFormRow = {
  id: number;
  produto: string;
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  sif: string;
  temperatura: string;
  transporteEntregador: string;
  aspectoSensorial: string;
  embalagem: string;
  acaoCorretiva: string;
  responsavelRecebimento: string | null;
  observacoes: string;
  statusGeral: StatusRecebimento;
};

type NoteItemsFormProps = {
  notaId: number;
  returnTo: string;
  rows: NoteItemFormRow[];
  readOnlyMode: boolean;
  xmlProductLocked: boolean;
  canDeleteItems: boolean;
  responsavelLogado: string;
  inputClassName: string;
};

const INITIAL_STATE: ActionState = {
  status: "idle",
  message: ""
};

const TABLE_HEAD_CLASS =
  "px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200";
const TABLE_CELL_CLASS = "block px-0 py-2 align-top lg:table-cell lg:px-2 lg:py-1.5";
const MOBILE_FIELD_LABEL_CLASS =
  "mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400 lg:hidden";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar Itens da Nota"}
    </button>
  );
}

function getConformidadeBadgeValue(status: StatusRecebimento) {
  if (status === "NAO_CONFORME") {
    return "NAO_CONFORME";
  }

  if (status === "CONFORME") {
    return "CONFORME";
  }

  return null;
}

export function NoteItemsForm({
  notaId,
  returnTo,
  rows,
  readOnlyMode,
  xmlProductLocked,
  canDeleteItems,
  responsavelLogado,
  inputClassName
}: NoteItemsFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveNotaItemsStateAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="space-y-4">
      {state.status !== "idle" && state.message ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="notaId" value={String(notaId)} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <div className="lg:overflow-x-auto lg:rounded-lg lg:border lg:border-slate-200 lg:dark:border-slate-700">
          <table className="block w-full text-sm lg:table lg:min-w-[1240px] lg:divide-y lg:divide-slate-200 lg:dark:divide-slate-700">
            <thead className="hidden bg-slate-50 text-left dark:bg-slate-800 lg:table-header-group">
              <tr>
                <th className={TABLE_HEAD_CLASS}>Produto</th>
                <th className={TABLE_HEAD_CLASS}>Lote *</th>
                <th className={TABLE_HEAD_CLASS}>Data de Fabricação *</th>
                <th className={TABLE_HEAD_CLASS}>Validade *</th>
                <th className={TABLE_HEAD_CLASS}>SIF</th>
                <th className={TABLE_HEAD_CLASS}>Temperatura *</th>
                <th className={TABLE_HEAD_CLASS}>Transporte *</th>
                <th className={TABLE_HEAD_CLASS}>Aspecto *</th>
                <th className={TABLE_HEAD_CLASS}>Embalagem *</th>
                <th className={TABLE_HEAD_CLASS}>Ação Corretiva</th>
                <th className={TABLE_HEAD_CLASS}>Responsável</th>
                <th className={TABLE_HEAD_CLASS}>Observações</th>
                <th className={TABLE_HEAD_CLASS}>Status</th>
                <th className={TABLE_HEAD_CLASS}>Ação</th>
              </tr>
            </thead>
            <tbody className="block space-y-3 lg:table-row-group lg:divide-y lg:divide-slate-100 lg:space-y-0 lg:dark:divide-slate-800">
              {rows.map((item) => {
                const rowKey = `item-${item.id}`;
                const invalid = state.invalidRowKey === rowKey;

                return (
                  <tr
                    key={item.id}
                    className={`block rounded-lg border bg-white p-3 dark:bg-slate-900 lg:table-row lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent ${
                      invalid
                        ? "border-red-300 dark:border-red-800"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Produto</span>
                      <input
                        type="text"
                        name={`${rowKey}-produto`}
                        defaultValue={item.produto}
                        required
                        disabled={readOnlyMode || xmlProductLocked}
                        className={`${inputClassName} min-w-[9rem] md:min-w-[11rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Lote *</span>
                      <input
                        type="text"
                        name={`${rowKey}-lote`}
                        defaultValue={item.lote}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[5.5rem] md:min-w-[6.5rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Data de Fabricação *</span>
                      <input
                        type="date"
                        name={`${rowKey}-dataFabricacao`}
                        defaultValue={item.dataFabricacao}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[7.5rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Validade *</span>
                      <input
                        type="date"
                        name={`${rowKey}-dataValidade`}
                        defaultValue={item.dataValidade}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[7.5rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>SIF *</span>
                      <input
                        type="text"
                        name={`${rowKey}-sif`}
                        defaultValue={item.sif}
                        list="sif-opcoes"
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[4.5rem] md:min-w-[5rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Temperatura *</span>
                      <input
                        type="text"
                        name={`${rowKey}-temperatura`}
                        inputMode="text"
                        defaultValue={item.temperatura}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[5rem] md:min-w-[5.5rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Transporte *</span>
                      <select
                        name={`${rowKey}-transporteEntregador`}
                        defaultValue={item.transporteEntregador}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[6.5rem]`}
                      >
                        <option value="">Selecione</option>
                        <option value="CONFORME">Conforme</option>
                        <option value="NAO_CONFORME">Não Conforme</option>
                      </select>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Aspecto *</span>
                      <select
                        name={`${rowKey}-aspectoSensorial`}
                        defaultValue={item.aspectoSensorial}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[6.5rem]`}
                      >
                        <option value="">Selecione</option>
                        <option value="CONFORME">Conforme</option>
                        <option value="NAO_CONFORME">Não Conforme</option>
                      </select>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Embalagem *</span>
                      <select
                        name={`${rowKey}-embalagem`}
                        defaultValue={item.embalagem}
                        required
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[6.5rem]`}
                      >
                        <option value="">Selecione</option>
                        <option value="CONFORME">Conforme</option>
                        <option value="NAO_CONFORME">Não Conforme</option>
                      </select>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Ação Corretiva</span>
                      <input
                        type="text"
                        name={`${rowKey}-acaoCorretiva`}
                        defaultValue={item.acaoCorretiva}
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[8rem] md:min-w-[9rem]`}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Responsável automático</span>
                      <div className="min-w-[7.5rem] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {readOnlyMode ? (item.responsavelRecebimento ?? "-") : responsavelLogado}
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Observações</span>
                      <input
                        type="text"
                        name={`${rowKey}-observacoes`}
                        defaultValue={item.observacoes}
                        disabled={readOnlyMode}
                        className={`${inputClassName} min-w-[8rem] md:min-w-[9rem]`}
                      />
                    </td>
                    <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Status</span>
                      <ConformidadeBadge value={getConformidadeBadgeValue(item.statusGeral)} />
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <span className={MOBILE_FIELD_LABEL_CLASS}>Ação</span>
                      {!canDeleteItems ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {readOnlyMode ? "Bloqueado" : "Sem exclusão"}
                        </span>
                      ) : (
                        <button
                          type="submit"
                          form={`delete-item-form-${item.id}`}
                          className="btn-danger"
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="sif-opcoes">
          <option value="NA" />
        </datalist>

        {!readOnlyMode ? (
          <div className="mt-4 btn-group">
            <SaveButton />
          </div>
        ) : null}
      </form>
    </div>
  );
}
