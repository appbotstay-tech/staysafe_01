import { ModuloDocumento } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const DEFAULT_EXIGIR_FOTO_EM_ALERTA_CRITICO = true;

export const FOTO_ALERTA_CRITICO_REQUIRED_MESSAGE =
  "É necessário anexar uma foto para registros com temperatura em alerta ou crítico.";

export async function getExigirFotoEmAlertaCritico(): Promise<boolean> {
  const configuracao = await prisma.moduloConfiguracao.findUnique({
    where: { modulo: ModuloDocumento.CONTROLE_TEMPERATURA },
    select: { exigirFotoEmAlertaCritico: true }
  });

  return (
    configuracao?.exigirFotoEmAlertaCritico ??
    DEFAULT_EXIGIR_FOTO_EM_ALERTA_CRITICO
  );
}
