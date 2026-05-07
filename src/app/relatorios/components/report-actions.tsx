"use client";

import Link from "next/link";

type ReportActionsProps = {
  exportHref: string;
};

export function ReportActions({ exportHref }: ReportActionsProps) {
  return (
    <div className="btn-group print:hidden">
      <Link href={exportHref} className="btn-primary">
        Exportar CSV/Excel
      </Link>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Imprimir
      </button>
    </div>
  );
}
