import { StatusPlanoLimpeza, TurnoPlanoLimpeza } from "@prisma/client";
import Link from "next/link";

import { updateDailyRecordAction } from "../actions";
import { getStatusLabel, getTurnoLabel, formatDateDisplay } from "../utils";

const INPUT_CLASS =
  "bpma-input";

type DailySignChecklistModalProps = {
  closeHref: string;
  returnTo: string;
  usuarioAssinando: string;
  dataHoraAtual: string;
  detalhamentoLimpeza?: string | null;
  record: {
    id: number;
    data: Date;
    turno: TurnoPlanoLimpeza;
    area: string;
    itemDescricao: string | null;
    produtoUtilizado: string | null;
    setorResponsavel: string | null;
    funcionarioResponsavel: string | null;
    status: StatusPlanoLimpeza;
    assinaturaResponsavel: string;
    assinaturaSupervisor: string;
  };
  etapa: "responsavel" | "supervisor";
};

export function DailySignChecklistModal({
  closeHref,
  returnTo,
  usuarioAssinando,
  dataHoraAtual,
  detalhamentoLimpeza,
  record,
  etapa
}: DailySignChecklistModalProps) {
  return (
    <div className="bpma-modal-backdrop">
      <div className="bpma-modal-panel max-w-xl">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Assinar Checklist Diário
        </h3>

        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Data</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {formatDateDisplay(record.data)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Turno</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {getTurnoLabel(record.turno)}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Área</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{record.area}</p>
          </div>
          {record.itemDescricao ? (
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Item/local</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {record.itemDescricao}
              </p>
            </div>
          ) : null}
          {record.produtoUtilizado || record.setorResponsavel || record.funcionarioResponsavel ? (
            <div className="md:col-span-2 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
              <p>Produto: <strong>{record.produtoUtilizado || "-"}</strong></p>
              <p>Setor: <strong>{record.setorResponsavel || "-"}</strong></p>
              <p>Funcionário: <strong>{record.funcionarioResponsavel || "-"}</strong></p>
            </div>
          ) : null}
          {detalhamentoLimpeza ? (
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                O que deve ser limpo
              </p>
              <p className="whitespace-pre-line break-words text-slate-700 dark:text-slate-200">
                {detalhamentoLimpeza}
              </p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status Atual</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {getStatusLabel(record.status)}
            </p>
          </div>
        </div>

        <form action={updateDailyRecordAction} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={String(record.id)} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="etapa" value={etapa} />

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Assinatura</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{usuarioAssinando}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Data e Hora: {dataHoraAtual}
            </p>
          </div>

          {etapa === "responsavel" ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Etapa: Assinatura do Responsável pela Limpeza.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Responsável pela Limpeza
                </p>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {record.assinaturaResponsavel}
                </p>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Etapa: Assinatura do Supervisor.
              </p>
            </>
          )}
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Confirme sua senha *
            <input type="password" name="senhaConfirmacao" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Observação (Opcional)
            <textarea
              name="observacaoAssinatura"
              rows={2}
              className={INPUT_CLASS}
              placeholder="Intercorrências da execução, se houver."
            />
          </label>

          <div className="btn-group">
            <Link href={closeHref} className="btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn-primary">
              Confirmar Assinatura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
