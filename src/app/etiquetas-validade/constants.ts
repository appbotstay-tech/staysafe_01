export const MODULE_PATH = "/etiquetas-validade";
export const OPTIONS_PATH = "/etiquetas-validade/opcoes";
export const HISTORY_PATH = "/etiquetas-validade/historico";

export const CARD_CLASS = "bpma-card";
export const INPUT_CLASS = "bpma-input";

export const UNIT_OPTIONS = [
  "g",
  "kg",
  "ml",
  "L",
  "unidade",
  "porção",
  "pacote",
  "bandeja"
] as const;

export type PrintConfig = {
  larguraMm: number;
  alturaMm: number;
  margemMm: number;
  tamanhoFonte: number;
  mostrarQrCode: boolean;
  mostrarSif: boolean;
  mostrarLote: boolean;
  mostrarMarcaFornecedor: boolean;
};

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  larguraMm: 80,
  alturaMm: 50,
  margemMm: 3,
  tamanhoFonte: 11,
  mostrarQrCode: false,
  mostrarSif: true,
  mostrarLote: true,
  mostrarMarcaFornecedor: true
};
