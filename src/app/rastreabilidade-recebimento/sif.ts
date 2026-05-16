export const SIF_NA_VALUE = "NA";

export const SIF_INPUT_REQUIRED_MESSAGE =
  "Informe o SIF do produto. Caso não se aplique, preencha NA.";

export const SIF_BACKEND_REQUIRED_MESSAGE =
  "O campo SIF é obrigatório. Caso não se aplique, informe NA.";

export function normalizeSifValue(value: string): string {
  const trimmed = value.trim();
  const normalized = trimmed.toLocaleLowerCase("pt-BR");

  if (
    trimmed === "__NAO_APLICA__" ||
    normalized === "na" ||
    normalized === "n/a" ||
    normalized === "não se aplica" ||
    normalized === "nao se aplica"
  ) {
    return SIF_NA_VALUE;
  }

  return trimmed;
}

export function isSifNaValue(value: string | null | undefined): boolean {
  return normalizeSifValue(value ?? "") === SIF_NA_VALUE;
}

export function formatSifDisplayValue(
  value: string | null | undefined,
  emptyFallback = "-"
): string {
  const normalized = normalizeSifValue(value ?? "");
  return normalized || emptyFallback;
}
