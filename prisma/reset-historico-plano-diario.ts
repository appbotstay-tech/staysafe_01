import "dotenv/config";

import { PrismaClient, TipoPlanoLimpeza } from "@prisma/client";

const CONFIRMATION_ENV = "BPMA_CONFIRM_RESET_PLANO_DIARIO";
const CONFIRMATION_VALUE = "SIM";

function printCount(label: string, count: number) {
  console.log(`- ${label}: ${count}`);
}

async function main() {
  if (process.env[CONFIRMATION_ENV] !== CONFIRMATION_VALUE) {
    console.error(
      "Operação cancelada. Defina BPMA_CONFIRM_RESET_PLANO_DIARIO=SIM para confirmar a limpeza do histórico do Plano Diário."
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [areasPreservadas, itensPreservados, assinaturasResponsavel, supervisoesVistos] =
          await Promise.all([
            tx.planoLimpezaDiarioArea.count(),
            tx.planoLimpezaDiarioItem.count(),
            tx.planoLimpezaDiarioRegistro.count({
              where: {
                OR: [
                  { assinaturaResponsavel: { not: "" } },
                  { assinaturaResponsavelUsuarioId: { not: null } },
                  { assinaturaResponsavelDataHora: { not: null } }
                ]
              }
            }),
            tx.planoLimpezaDiarioRegistro.count({
              where: {
                OR: [
                  { assinaturaSupervisor: { not: "" } },
                  { assinaturaSupervisorUsuarioId: { not: null } },
                  { assinaturaSupervisorDataHora: { not: null } }
                ]
              }
            })
          ]);

        const assinaturas = await tx.logAssinatura.deleteMany({
          where: { modulo: "plano-limpeza/diario" }
        });
        const execucoes = await tx.planoLimpezaDiarioRegistro.deleteMany();
        const fechamentos = await tx.planoLimpezaFechamento.deleteMany({
          where: { tipo: TipoPlanoLimpeza.DIARIO }
        });

        return {
          execucoes: execucoes.count,
          assinaturasLogs: assinaturas.count,
          assinaturasResponsavel,
          supervisoesVistos,
          fechamentos: fechamentos.count,
          areasPreservadas,
          itensPreservados
        };
      },
      { timeout: 120_000 }
    );

    console.log("Limpeza do histórico do Plano Diário concluída.");
    printCount("Execuções do Plano Diário removidas", result.execucoes);
    printCount(
      "Assinaturas removidas",
      result.assinaturasLogs + result.assinaturasResponsavel
    );
    printCount("Supervisões/vistos removidos", result.supervisoesVistos);
    printCount("Fechamentos/históricos removidos", result.fechamentos);
    printCount("Áreas preservadas", result.areasPreservadas);
    printCount("Itens/locais preservados", result.itensPreservados);
    console.log("Cadastros base do Plano Diário foram preservados.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Falha ao limpar histórico do Plano Diário.");
  console.error(error);
  process.exitCode = 1;
});
