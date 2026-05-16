import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-session";
import { canAccessReports } from "@/lib/rbac";

import { ReportActions } from "./components/report-actions";
import { ReportControls } from "./components/report-controls";
import { getReportDefinition, getReportModule } from "./report-definitions";
import { generateReport, type GeneratedReport, type ReportSearchParams } from "./report-service";

type PageProps = {
  searchParams: Promise<ReportSearchParams>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateTimeDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function buildInitialFilters(params: ReportSearchParams): Record<string, string> {
  const ignored = new Set(["module", "report", "generated", "feedback", "feedbackType"]);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (ignored.has(key)) continue;
    const normalized = firstParam(value).trim();
    if (normalized) result[key] = normalized;
  }
  return result;
}

function ReportResult({ report }: { report: GeneratedReport }) {
  return (
    <section className="bpma-card space-y-5 print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            BPMA App
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {report.reportLabel}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {report.moduleLabel} • {report.periodLabel}
          </p>
        </div>
        <ReportActions />
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800 md:grid-cols-2 xl:grid-cols-4">
        <p><strong>Sistema:</strong> BPMA App</p>
        <p><strong>Relatório:</strong> {report.reportLabel}</p>
        <p><strong>Usuário que emitiu:</strong> {report.generatedBy}</p>
        <p><strong>Perfil:</strong> {report.generatedByRole}</p>
        <p><strong>Emissão:</strong> {formatDateTimeDisplay(report.generatedAt)}</p>
        <p><strong>Módulo:</strong> {report.moduleLabel}</p>
        <p><strong>Período:</strong> {report.periodLabel}</p>
      </div>

      {report.appliedFilters.length > 0 ? (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtros aplicados</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.appliedFilters.map((filter) => (
              <span
                key={`${filter.label}-${filter.value}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {filter.label}: {filter.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      {report.notes?.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {report.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      ) : null}

      <div className="bpma-table-scroll">
        <table className="bpma-data-table min-w-[56rem]">
          <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              {report.columns.map((column) => (
                <th key={column.key} className="px-3 py-2">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={report.columns.length} className="px-3 py-4 text-slate-500 dark:text-slate-400">
                  Nenhum dado encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              report.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {report.columns.map((column) => (
                    <td key={column.key} className="max-w-80 whitespace-normal break-words px-3 py-2 align-top">
                      {row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Relatório gerado automaticamente pelo BPMA App. Alterações manuais descaracterizam o documento.
      </footer>
    </section>
  );
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canAccessReports(user.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const moduleParam = firstParam(params.module).trim();
  const reportParam = firstParam(params.report).trim();
  const selectedModule = getReportModule(moduleParam);
  const selectedReport = getReportDefinition(selectedModule.id, reportParam);
  const generated = firstParam(params.generated) === "1";
  const initialFilters = buildInitialFilters(params);
  const report = generated
    ? await generateReport({
        moduleId: selectedModule.id,
        reportId: selectedReport.id,
        searchParams: params,
        user
      })
    : null;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className="bpma-card print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Relatórios e Auditoria
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Selecione o módulo, escolha o relatório, aplique apenas os filtros compatíveis e gere a visão de auditoria.
        </p>
      </section>

      <ReportControls
        selectedModuleId={selectedModule.id}
        selectedReportId={selectedReport.id}
        initialFilters={initialFilters}
      />

      {report ? (
        <ReportResult report={report} />
      ) : (
        <section className="bpma-card print:hidden">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Escolha o módulo e o tipo de relatório para exibir os filtros. Depois clique em <strong>Gerar Relatório</strong>.
          </p>
        </section>
      )}
    </div>
  );
}
