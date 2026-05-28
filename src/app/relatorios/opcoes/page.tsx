import { ModuloDocumento } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ModuleHeaderTextSettings } from "@/components/documentos/module-header-text-settings";
import { getCurrentUser } from "@/lib/auth-session";
import { canManageModuleOptions } from "@/lib/rbac";

const PAGE_PATH = "/relatorios/opcoes";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function RelatoriosOpcoesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canManageModuleOptions(user)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className="bpma-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar Opções - Relatórios e Auditoria
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configure orientações exibidas na página de relatórios.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/relatorios" className="btn-secondary">
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
        modulo={ModuloDocumento.RELATORIOS_AUDITORIA}
        returnTo={PAGE_PATH}
      />
    </div>
  );
}
