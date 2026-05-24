// Script seguro para limpeza operacional geral.
// Remove somente históricos/registros executados e preserva cadastros base,
// usuários, documentos, opções e configurações dos módulos.
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

function printItem(label: string) {
  console.log(`- ${label}`);
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
    console.log("");
    console.log("Históricos removidos:");
    printCount("Notas importadas", deleted.rastreabilidadeNotas);
    printCount("Itens/registros de recebimento", deleted.rastreabilidadeRegistros);
    printCount("Registros/coletas de buffet e amostras", deleted.buffetRegistros);
    printCount("Aferições de temperatura", deleted.temperaturaRegistros);
    printCount("Registros de hortifruti", deleted.hortifrutiRegistros);
    printCount("Registros de qualidade do óleo", deleted.oleoRegistros);
    printCount("Execuções do Plano Diário", deleted.planoDiarioExecucoes);
    printCount("Execuções do Plano Semanal", deleted.planoSemanalExecucoes);
    printCount("Chamados de manutenção", deleted.chamados);
    printCount("Fechamentos mensais", fechamentos);
    printCount("Assinaturas/logs operacionais", deleted.assinaturas);
    printCount("Registros iniciais legados", deleted.registrosIniciaisLegados);

    console.log("");
    console.log("Fechamentos removidos por módulo:");
    printCount("Buffet / Amostras", deleted.buffetFechamentos);
    printCount("Plano de Limpeza", deleted.planoLimpezaFechamentos);
    printCount("Rastreabilidade", deleted.rastreabilidadeFechamentos);
    printCount("Óleo", deleted.oleoFechamentos);
    printCount("Temperatura", deleted.temperaturaFechamentos);
    printCount("Hortifruti", deleted.hortifrutiFechamentos);

    console.log("");
    console.log("Cadastros preservados:");
    printItem("Usuários, perfis, sessões e permissões");
    printItem("Documentos técnicos/anexos e textos livres dos módulos");
    printItem("Equipamentos, categorias e regras de temperatura");
    printItem("Produtos/hortifrutis e opções de higienização");
    printItem("Configurações e opções do controle de óleo");
    printItem("Categorias de recebimento/rastreabilidade");
    printItem("Itens, ações corretivas e serviços de buffet/amostras");
    printItem("Áreas e itens/locais do Plano de Limpeza Diário");
    printItem("Áreas e itens/locais do Plano de Limpeza Semanal");
    printItem("Configurações base de chamados e módulos");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Falha ao limpar históricos operacionais.");
  console.error(error);
  process.exitCode = 1;
});
