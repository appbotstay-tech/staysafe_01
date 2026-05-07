"use client";

import { useRouter } from "next/navigation";

import {
  REPORT_MODULES,
  getFiltersForReport,
  getReportDefinition,
  getReportModule,
  type ReportFilterDefinition
} from "../report-definitions";

type ReportControlsProps = {
  selectedModuleId: string;
  selectedReportId: string;
  initialFilters: Record<string, string>;
};

const INPUT_CLASS = "bpma-input";

function renderFilter(filter: ReportFilterDefinition, value: string) {
  if (filter.type === "select") {
    return (
      <select name={filter.key} defaultValue={value} className={INPUT_CLASS}>
        {filter.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={filter.type === "number" ? "text" : filter.type}
      inputMode={filter.type === "number" ? "decimal" : undefined}
      name={filter.key}
      defaultValue={value}
      placeholder={filter.placeholder}
      className={INPUT_CLASS}
    />
  );
}

export function ReportControls({ selectedModuleId, selectedReportId, initialFilters }: ReportControlsProps) {
  const router = useRouter();
  const selectedModule = getReportModule(selectedModuleId);
  const selectedReport = getReportDefinition(selectedModule.id, selectedReportId);
  const filters = getFiltersForReport(selectedModule.id, selectedReport.id);

  function handleModuleChange(moduleId: string) {
    const moduleDefinition = getReportModule(moduleId);
    const params = new URLSearchParams();
    params.set("module", moduleDefinition.id);
    params.set("report", moduleDefinition.reports[0].id);
    router.push(`/relatorios?${params.toString()}`);
  }

  function handleReportChange(reportId: string) {
    const params = new URLSearchParams();
    params.set("module", selectedModule.id);
    params.set("report", reportId);
    router.push(`/relatorios?${params.toString()}`);
  }

  return (
    <section className="bpma-card print:hidden">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Selecione o módulo
          <select
            name="module-selector"
            value={selectedModule.id}
            onChange={(event) => handleModuleChange(event.target.value)}
            className={INPUT_CLASS}
          >
            {REPORT_MODULES.map((module) => (
              <option key={module.id} value={module.id}>
                {module.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700 dark:text-slate-200">
          Selecione o relatório
          <select
            name="report-selector"
            value={selectedReport.id}
            onChange={(event) => handleReportChange(event.target.value)}
            className={INPUT_CLASS}
          >
            {selectedModule.reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {selectedReport.description}
      </div>

      <form method="get" className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <input type="hidden" name="module" value={selectedModule.id} />
        <input type="hidden" name="report" value={selectedReport.id} />
        <input type="hidden" name="generated" value="1" />

        {filters.map((filter) => (
          <label key={filter.key} className="text-sm text-slate-700 dark:text-slate-200">
            {filter.label}
            {renderFilter(filter, initialFilters[filter.key] ?? "")}
          </label>
        ))}

        <div className="btn-group md:col-span-3 xl:col-span-4">
          <button type="submit" className="btn-primary">
            Gerar Relatório
          </button>
          <a href="/relatorios" className="btn-secondary">
            Limpar
          </a>
        </div>
      </form>
    </section>
  );
}
