import { formatAppDate, formatAppDateTime } from "@/lib/date-time";

import type { PrintConfig } from "./constants";

const MAX_PRINT_COPIES = 20;

export type EtiquetaSnapshot = {
  origem?: "AUTOMATICA" | "MANUAL";
  produtoNomeSnapshot: string;
  grupoNomeSnapshot: string | null;
  subgrupoNomeSnapshot: string | null;
  metodoNomeSnapshot: string;
  validadeDiasSnapshot: number | null;
  validadeHorasSnapshot: number | null;
  temperaturaReferenciaSnapshot: string | null;
  dataManipulacao: Date;
  horaManipulacao: string | null;
  dataValidade: Date;
  horaValidade: string | null;
  responsavelNomeSnapshot: string;
  marcaFornecedor: string | null;
  sif: string | null;
  lote: string | null;
  quantidade: string | null;
  unidadeSnapshot: string;
  validadeOriginal: Date | null;
  observacao: string | null;
  codigoEtiqueta: string;
  criadoEm: Date;
};

function labelDate(date: Date, time?: string | null): string {
  return time ? `${formatAppDate(date)} ${time}` : formatAppDate(date);
}

function optionalText(value?: string | null): string {
  return value?.trim() || "-";
}

function quantityLabel(label: EtiquetaSnapshot): string {
  if (!label.quantidade?.trim()) {
    return "-";
  }

  return `${label.quantidade.trim()} ${label.unidadeSnapshot}`;
}

function validityRuleLabel(label: EtiquetaSnapshot): string {
  if (label.origem === "MANUAL") {
    return "Manual";
  }

  const parts = [];
  if (label.validadeDiasSnapshot) parts.push(`${label.validadeDiasSnapshot} dia(s)`);
  if (label.validadeHorasSnapshot) parts.push(`${label.validadeHorasSnapshot} hora(s)`);

  return parts.join(" + ") || "Automática";
}

function normalizePrintCopies(copias?: number): number {
  if (!Number.isFinite(copias) || !copias || copias < 1) {
    return 1;
  }

  return Math.min(Math.trunc(copias), MAX_PRINT_COPIES);
}

function LabelInfo({ label, value }: { label: string; value: string }) {
  return (
    <p className="leading-tight">
      <span className="font-semibold">{label}:</span> {value}
    </p>
  );
}

export function EtiquetaPrintStyles({ config }: { config: PrintConfig }) {
  const printStyles = `
    @media print {
      @page {
        size: ${config.larguraMm}mm ${config.alturaMm}mm;
        margin: 0;
      }

      html,
      body {
        width: ${config.larguraMm}mm !important;
        height: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #ffffff !important;
      }

      body * {
        visibility: hidden !important;
        box-shadow: none !important;
      }

      body :not(#etiqueta-print-area):not(#etiqueta-print-area *):not(:has(#etiqueta-print-area)) {
        display: none !important;
      }

      body :has(#etiqueta-print-area) {
        position: static !important;
        inset: auto !important;
        display: block !important;
        width: ${config.larguraMm}mm !important;
        height: auto !important;
        min-height: 0 !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: transparent !important;
      }

      #etiqueta-print-area,
      #etiqueta-print-area * {
        visibility: visible !important;
      }

      #etiqueta-print-area {
        position: static !important;
        display: block !important;
        width: ${config.larguraMm}mm !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        gap: 0 !important;
        overflow: visible !important;
        background: #ffffff !important;
      }

      #etiqueta-print-area .staylabel-print-label {
        width: ${config.larguraMm}mm !important;
        height: ${config.alturaMm}mm !important;
        min-height: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
        break-after: auto !important;
        page-break-after: auto !important;
      }

      #etiqueta-print-area .staylabel-print-label:not(:last-child) {
        break-after: page !important;
        page-break-after: always !important;
      }

      .no-print {
        display: none !important;
      }
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: printStyles }} />;
}

function EtiquetaLabelArticle({
  etiqueta,
  config
}: {
  etiqueta: EtiquetaSnapshot;
  config: PrintConfig;
}) {
  const grupo = etiqueta.subgrupoNomeSnapshot || etiqueta.grupoNomeSnapshot || "-";

  return (
    <article
      className="staylabel-print-label rounded border border-slate-900 bg-white p-3 text-slate-950 shadow-sm"
      data-zebra-model="ZD220"
      data-zpl-ready="future"
      style={{
        width: `${config.larguraMm}mm`,
        height: `${config.alturaMm}mm`,
        boxSizing: "border-box",
        overflow: "hidden",
        padding: `${config.margemMm}mm`,
        fontSize: `${config.tamanhoFonte}pt`,
        lineHeight: 1.18
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1">
        <div className="min-w-0">
          <h3 className="break-words text-base font-black uppercase leading-tight">
            {etiqueta.produtoNomeSnapshot}
          </h3>
          <p className="text-[0.72em]">
            {grupo} • {etiqueta.metodoNomeSnapshot}
          </p>
        </div>
        {config.mostrarQrCode ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-900 p-1 text-center text-[0.55em] font-bold leading-tight">
            {etiqueta.codigoEtiqueta}
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <LabelInfo
          label="Manipulação"
          value={labelDate(etiqueta.dataManipulacao, etiqueta.horaManipulacao)}
        />
        <LabelInfo
          label="Validade"
          value={labelDate(etiqueta.dataValidade, etiqueta.horaValidade)}
        />
        <LabelInfo label="Resp." value={etiqueta.responsavelNomeSnapshot} />
        <LabelInfo label="Qtd." value={quantityLabel(etiqueta)} />
        <LabelInfo label="Regra" value={validityRuleLabel(etiqueta)} />
        <LabelInfo
          label="Temp."
          value={optionalText(etiqueta.temperaturaReferenciaSnapshot)}
        />
        {config.mostrarMarcaFornecedor ? (
          <LabelInfo label="Marca/Forn." value={optionalText(etiqueta.marcaFornecedor)} />
        ) : null}
        {config.mostrarSif ? (
          <LabelInfo label="SIF" value={optionalText(etiqueta.sif)} />
        ) : null}
        {config.mostrarLote ? (
          <LabelInfo label="Lote" value={optionalText(etiqueta.lote)} />
        ) : null}
        <LabelInfo
          label="Val. original"
          value={etiqueta.validadeOriginal ? formatAppDate(etiqueta.validadeOriginal) : "-"}
        />
        <LabelInfo label="Gerada" value={formatAppDateTime(etiqueta.criadoEm)} />
      </div>

      {etiqueta.observacao ? (
        <p className="mt-2 border-t border-slate-300 pt-1 text-[0.8em]">
          Obs.: {etiqueta.observacao}
        </p>
      ) : null}

      <p className="mt-2 border-t border-slate-900 pt-1 text-center text-[0.8em] font-bold">
        Código: {etiqueta.codigoEtiqueta}
      </p>
    </article>
  );
}

export function EtiquetaCard({
  etiqueta,
  config,
  copias = 1
}: {
  etiqueta: EtiquetaSnapshot;
  config: PrintConfig;
  copias?: number;
}) {
  const totalCopias = normalizePrintCopies(copias);

  return (
    <div id="etiqueta-print-area" className="flex flex-col gap-3 overflow-x-auto">
      {Array.from({ length: totalCopias }, (_, index) => (
        <EtiquetaLabelArticle
          key={`${etiqueta.codigoEtiqueta}-${index}`}
          etiqueta={etiqueta}
          config={config}
        />
      ))}
    </div>
  );
}
