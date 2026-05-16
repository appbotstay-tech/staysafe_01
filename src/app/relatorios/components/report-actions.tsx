"use client";

export function ReportActions() {
  return (
    <div className="btn-group print:hidden">
      <button type="button" className="btn-primary" onClick={() => window.print()}>
        Emitir PDF
      </button>
    </div>
  );
}
