"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createServicoEsporadicoStateAction } from "./actions";

type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  servicoId?: number;
  dataInput?: string;
};

type SporadicServiceModalProps = {
  todayInput: string;
  disabled?: boolean;
};

const INITIAL_STATE: ActionState = {
  status: "idle",
  message: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Criando..." : "Criar Serviço"}
    </button>
  );
}

export function SporadicServiceModal({
  todayInput,
  disabled = false
}: SporadicServiceModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(
    createServicoEsporadicoStateAction,
    INITIAL_STATE
  );

  useEffect(() => {
    if (state.status === "success" && state.servicoId && state.dataInput) {
      router.push(`/controle-buffet-amostras/servico/${state.servicoId}?data=${state.dataInput}`);
    }
  }, [router, state.dataInput, state.servicoId, state.status]);

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        Adicionar Serviço Esporádico
      </button>

      {isOpen ? (
        <div className="bpma-modal-backdrop" role="dialog" aria-modal="true">
          <section className="bpma-modal-panel max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Adicionar Serviço Esporádico
            </h3>

            {state.status === "error" && state.message ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {state.message}
              </p>
            ) : null}

            <form action={formAction} className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome do serviço *
                <input type="text" name="nome" required className="bpma-input" />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Data do serviço *
                <input
                  type="date"
                  name="data"
                  required
                  defaultValue={todayInput}
                  className="bpma-input"
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Observação
                <textarea name="observacao" rows={3} className="bpma-input" />
              </label>

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton />
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
