"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  ClassificacaoItemBuffetAmostra,
  StatusItemBuffetAmostra,
  StatusTemperaturaBuffetAmostra
} from "@prisma/client";

import {
  createExtraItemStateAction,
  saveServicoItemsStateAction
} from "../../actions";
import { ItemStatusBadge, TemperatureStatusBadge } from "../../status-badges";
import { getClassificacaoLabel } from "../../utils";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  invalidRowKey?: string;
};

type AcaoCorretivaOption = {
  id: number;
  nome: string;
};

export type ServiceItemFormRow = {
  rowKey: string;
  nome: string;
  classificacao: ClassificacaoItemBuffetAmostra;
  isExtra: boolean;
  guideline: string;
  status: StatusItemBuffetAmostra;
  statusTemperatura: StatusTemperaturaBuffetAmostra | null;
  avaliacaoOrientacao: string | null;
  tcEquipamento: string;
  primeiraTc: string;
  segundaTc: string;
  acaoCorretiva: string;
  observacao: string;
  responsavelNome: string | null;
  dataHoraRegistro: string | null;
  assinaturaResumo: string | null;
  bloqueado: boolean;
};

type ServiceItemsFormProps = {
  servicoId: number;
  dataInput: string;
  returnTo: string;
  usuarioLogado: string;
  fechamentoAssinado: boolean;
  rows: ServiceItemFormRow[];
  acoesCorretivas: AcaoCorretivaOption[];
  inputClassName: string;
};

const INITIAL_STATE: ActionState = {
  status: "idle",
  message: ""
};

function SubmitItemsButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={disabled || pending}>
      {pending ? "Salvando..." : "Salvar Itens do Serviço"}
    </button>
  );
}

function AddExtraSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar Item"}
    </button>
  );
}

function AddExtraItemModal({
  servicoId,
  dataInput,
  disabled
}: {
  servicoId: number;
  dataInput: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createExtraItemStateAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success") {
      setIsOpen(false);
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        Adicionar Item Extra
      </button>

      {isOpen ? (
        <div className="bpma-modal-backdrop">
          <section className="bpma-modal-panel max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Adicionar Item Extra
            </h3>

            {state.status === "error" ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {state.message}
              </p>
            ) : null}

            <form action={formAction} className="mt-4 grid gap-3">
              <input type="hidden" name="servicoId" value={String(servicoId)} />
              <input type="hidden" name="data" value={dataInput} />

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome do Item/Produto *
                <input type="text" name="nome" required className="bpma-input" />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Classificação *
                <select name="classificacao" required className="bpma-input">
                  <option value="QUENTE">Quente</option>
                  <option value="FRIO">Frio</option>
                  <option value="FRIO_CRU">Frio Cru</option>
                </select>
              </label>

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <AddExtraSubmitButton />
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function ServiceItemsForm({
  servicoId,
  dataInput,
  returnTo,
  usuarioLogado,
  fechamentoAssinado,
  rows,
  acoesCorretivas,
  inputClassName
}: ServiceItemsFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveServicoItemsStateAction, INITIAL_STATE);
  const hasEditableRows = rows.some((row) => !row.bloqueado);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Nenhum item ativo está vinculado a este serviço. Se necessário, adicione um item extra para
          esta data.
        </p>
        <AddExtraItemModal
          servicoId={servicoId}
          dataInput={dataInput}
          disabled={fechamentoAssinado}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AddExtraItemModal
          servicoId={servicoId}
          dataInput={dataInput}
          disabled={fechamentoAssinado}
        />
      </div>

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

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="servicoId" value={String(servicoId)} />
        <input type="hidden" name="data" value={dataInput} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((row) => {
            const acaoEstaAtiva = acoesCorretivas.some(
              (option) => option.nome === row.acaoCorretiva
            );
            const invalid = state.invalidRowKey === row.rowKey;

            return (
              <section
                key={row.rowKey}
                className={`rounded-lg border p-4 ${
                  invalid
                    ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <input type="hidden" name="rowKey" value={row.rowKey} />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {row.nome}
                      </h3>
                      {row.isExtra ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                          Item extra
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {row.guideline}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {getClassificacaoLabel(row.classificacao)}
                    </span>
                    <TemperatureStatusBadge status={row.statusTemperatura} />
                  </div>
                </div>

                {row.avaliacaoOrientacao ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {row.avaliacaoOrientacao}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    TC Equipamento
                    <input
                      type="text"
                      name={`${row.rowKey}-tcEquipamento`}
                      inputMode="text"
                      placeholder="Ex.: -18 ou 62,5"
                      defaultValue={row.tcEquipamento}
                      className={inputClassName}
                      disabled={row.bloqueado}
                    />
                  </label>
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    1ª TC
                    <input
                      type="text"
                      name={`${row.rowKey}-primeiraTc`}
                      inputMode="text"
                      placeholder="Ex.: -12,5"
                      defaultValue={row.primeiraTc}
                      className={inputClassName}
                      disabled={row.bloqueado}
                    />
                  </label>
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    2ª TC
                    <input
                      type="text"
                      name={`${row.rowKey}-segundaTc`}
                      inputMode="text"
                      placeholder="Ex.: 10,5"
                      defaultValue={row.segundaTc}
                      className={inputClassName}
                      disabled={row.bloqueado}
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    Ação Corretiva
                    <select
                      name={`${row.rowKey}-acaoCorretiva`}
                      defaultValue={row.acaoCorretiva}
                      className={inputClassName}
                      disabled={row.bloqueado}
                    >
                      <option value="">Selecione</option>
                      {!acaoEstaAtiva && row.acaoCorretiva ? (
                        <option value={row.acaoCorretiva}>{row.acaoCorretiva} (Inativa)</option>
                      ) : null}
                      {acoesCorretivas.map((option) => (
                        <option key={option.id} value={option.nome}>
                          {option.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    Observação
                    <textarea
                      name={`${row.rowKey}-observacao`}
                      rows={2}
                      defaultValue={row.observacao}
                      className={inputClassName}
                      disabled={row.bloqueado}
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:grid-cols-2">
                  <p>
                    Responsável: <strong>{row.responsavelNome ?? usuarioLogado}</strong>
                  </p>
                  <p>
                    Data/hora: <strong>{row.dataHoraRegistro ?? "-"}</strong>
                  </p>
                  <p>
                    Status: <ItemStatusBadge status={row.status} />
                  </p>
                  <p>
                    Assinatura: <strong>{row.assinaturaResumo ?? "-"}</strong>
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <SubmitItemsButton disabled={!hasEditableRows || acoesCorretivas.length === 0} />
        </div>
      </form>
    </div>
  );
}
