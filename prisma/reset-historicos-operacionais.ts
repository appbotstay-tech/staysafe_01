import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

const CONFIRMATION_ENV = "BPMA_CONFIRM_RESET_HISTORICOS";
const CONFIRMATION_VALUE = "SIM";

const OPERATIONAL_LOG_MODULES = [
  "higienizacao-hortifruti",
  "controle-temperatura-equipamentos",
  "controle-qualidade-oleo",
  "rastreabilidade-recebimento",
  "controle-buffet-amostras",
  "controle-buffet-amostras/item",
  "controle-buffet-amostras/servico",
  "plano-limpeza/diario",
  "plano-limpeza/semanal",
  "chamados-manutencao/abertura"
] as const;

const operationalLogWhere: Prisma.LogAssinaturaWhereInput = {
  OR: [
    { modulo: { in: [...OPERATIONAL_LOG_MODULES] } },
    { modulo: { startsWith: "controle-buffet-amostras/" } },
    { modulo: { startsWith: "plano-limpeza/" } },
    { modulo: { startsWith: "chamados-manutencao/" } }
  ]
};

function printCount(label: string, count: number) {
  console.log(`- ${label}: ${count}`);
}

async function main() {
  if (process.env[CONFIRMATION_ENV] !== CONFIRMATION_VALUE) {
    console.error(
      "Operação cancelada. Defina BPMA_CONFIRM_RESET_HISTORICOS=SIM para confirmar a limpeza dos históricos operacionais."
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const deleted = await prisma.$transaction(
      async (tx) => {
        const assinaturas = await tx.logAssinatura.deleteMany({
          where: operationalLogWhere
        });

        const chamados = await tx.chamadoManutencao.deleteMany();

        const buffetRegistros = await tx.controleBuffetAmostraRegistro.deleteMany();
        const buffetFechamentos = await tx.controleBuffetAmostraFechamento.deleteMany();

        const planoSemanalExecucoes = await tx.planoLimpezaSemanalExecucao.deleteMany();
        const planoDiarioExecucoes = await tx.planoLimpezaDiarioRegistro.deleteMany();
        const planoLimpezaFechamentos = await tx.planoLimpezaFechamento.deleteMany();

        const rastreabilidadeRegistros = await tx.rastreabilidadeRecebimentoRegistro.deleteMany();
        const rastreabilidadeNotas = await tx.rastreabilidadeRecebimentoNota.deleteMany();
        const rastreabilidadeFechamentos =
          await tx.rastreabilidadeRecebimentoFechamento.deleteMany();

        const oleoRegistros = await tx.controleQualidadeOleoRegistro.deleteMany();
        const oleoFechamentos = await tx.controleQualidadeOleoFechamento.deleteMany();

        const temperaturaRegistros = await tx.controleTemperaturaEquipamento.deleteMany();
        const temperaturaFechamentos =
          await tx.controleTemperaturaEquipamentoFechamento.deleteMany();

        const hortifrutiRegistros = await tx.higienizacaoHortifruti.deleteMany();
        const hortifrutiFechamentos = await tx.higienizacaoHortifrutiFechamento.deleteMany();

        const registrosIniciaisLegados = await tx.registroInicial.deleteMany();

        return {
          assinaturas: assinaturas.count,
          chamados: chamados.count,
          buffetRegistros: buffetRegistros.count,
          buffetFechamentos: buffetFechamentos.count,
          planoSemanalExecucoes: planoSemanalExecucoes.count,
          planoDiarioExecucoes: planoDiarioExecucoes.count,
          planoLimpezaFechamentos: planoLimpezaFechamentos.count,
          rastreabilidadeRegistros: rastreabilidadeRegistros.count,
          rastreabilidadeNotas: rastreabilidadeNotas.count,
          rastreabilidadeFechamentos: rastreabilidadeFechamentos.count,
          oleoRegistros: oleoRegistros.count,
          oleoFechamentos: oleoFechamentos.count,
          temperaturaRegistros: temperaturaRegistros.count,
          temperaturaFechamentos: temperaturaFechamentos.count,
          hortifrutiRegistros: hortifrutiRegistros.count,
          hortifrutiFechamentos: hortifrutiFechamentos.count,
          registrosIniciaisLegados: registrosIniciaisLegados.count
        };
      },
      { timeout: 180_000 }
    );

    const fechamentos =
      deleted.buffetFechamentos +
      deleted.planoLimpezaFechamentos +
      deleted.rastreabilidadeFechamentos +
      deleted.oleoFechamentos +
      deleted.temperaturaFechamentos +
      deleted.hortifrutiFechamentos;

    console.log("Limpeza de históricos operacionais concluída.");
    printCount("Registros de temperatura removidos", deleted.temperaturaRegistros);
    printCount("Execuções de hortifruti removidas", deleted.hortifrutiRegistros);
    printCount("Registros de qualidade do óleo removidos", deleted.oleoRegistros);
    printCount("Itens de rastreabilidade removidos", deleted.rastreabilidadeRegistros);
    printCount("Notas de rastreabilidade removidas", deleted.rastreabilidadeNotas);
    printCount("Registros de amostras removidos", deleted.buffetRegistros);
    printCount("Execuções de plano diário removidas", deleted.planoDiarioExecucoes);
    printCount("Execuções de plano semanal removidas", deleted.planoSemanalExecucoes);
    printCount("Chamados removidos", deleted.chamados);
    printCount("Fechamentos removidos", fechamentos);
    printCount("Assinaturas removidas", deleted.assinaturas);
    printCount("Registros iniciais legados removidos", deleted.registrosIniciaisLegados);
    console.log("Cadastros base preservados.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Falha ao limpar históricos operacionais.");
  console.error(error);
  process.exitCode = 1;
});
