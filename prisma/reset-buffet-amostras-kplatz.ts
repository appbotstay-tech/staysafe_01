require("dotenv/config");

const { ClassificacaoItemBuffetAmostra, PrismaClient } = require("@prisma/client");

type PrismaClientInstance = import("@prisma/client").PrismaClient;
type PrismaTransactionClient = Omit<
  PrismaClientInstance,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const CONFIRMATION_ENV = "BPMA_CONFIRM_RESET_BUFFET";
const CONFIRMATION_VALUE = "SIM";
const SERVICE_NAME = "Café da Manhã";

const prisma: PrismaClientInstance = new PrismaClient();

const DEFAULT_CORRECTIVE_ACTIONS = [
  { nome: "Alimento exposto por menos de 1 hora no buffet", ordem: 1 },
  { nome: "Alimento exposto por menos de 2 horas no buffet", ordem: 2 },
  { nome: "Alimento descartado", ordem: 3 },
  { nome: "Não se aplica", ordem: 4 }
] as const;

const BREAKFAST_ITEMS = [
  { nome: "Café", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 1 },
  { nome: "Ovo cozido", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 2 },
  { nome: "Ovo Mexido", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 3 },
  { nome: "Bacon", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 4 },
  { nome: "Calabresa", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 5 },
  { nome: "Batata Doce", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 6 },
  { nome: "Brócolis", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 7 },
  { nome: "Banana cozida", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 8 },
  { nome: "Pão de queijo", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 9 },
  { nome: "Leite quente", classificacao: ClassificacaoItemBuffetAmostra.QUENTE, ordem: 10 },
  {
    nome: "Bolo 1",
    classificacao: ClassificacaoItemBuffetAmostra.TEMPERATURA_AMBIENTE,
    ordem: 11
  },
  {
    nome: "Bolo 2",
    classificacao: ClassificacaoItemBuffetAmostra.TEMPERATURA_AMBIENTE,
    ordem: 12
  },
  {
    nome: "Bolo 3",
    classificacao: ClassificacaoItemBuffetAmostra.TEMPERATURA_AMBIENTE,
    ordem: 13
  },
  {
    nome: "Bolo 4",
    classificacao: ClassificacaoItemBuffetAmostra.TEMPERATURA_AMBIENTE,
    ordem: 14
  },
  { nome: "Mamão", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 15 },
  { nome: "Melancia", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 16 },
  { nome: "Uvas", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 17 },
  { nome: "Melão", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 18 },
  { nome: "Abacaxi", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 19 },
  { nome: "Salada de Frutas", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 20 },
  { nome: "Queijo branco", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 21 },
  { nome: "Queijo Mussarela", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 22 },
  { nome: "Queijo colonial", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 23 },
  { nome: "Salame", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 24 },
  { nome: "Peito de Peru", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 25 },
  { nome: "Presunto", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 26 },
  { nome: "Tomate", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 27 },
  { nome: "Alface", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 28 },
  { nome: "Abacate", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 29 },
  { nome: "Goiaba", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 30 },
  { nome: "Manga", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 31 },
  { nome: "Kiwi", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 32 },
  { nome: "Suco verde", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 33 },
  { nome: "Suco Laranja", classificacao: ClassificacaoItemBuffetAmostra.FRIO, ordem: 34 }
] as const;

async function main() {
  if (process.env[CONFIRMATION_ENV] !== CONFIRMATION_VALUE) {
    console.error(
      `Operação cancelada. Defina ${CONFIRMATION_ENV}=SIM para confirmar a limpeza do módulo de amostras.`
    );
    process.exitCode = 1;
    return;
  }

  const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const registros = await tx.controleBuffetAmostraRegistro.deleteMany();
    const fechamentos = await tx.controleBuffetAmostraFechamento.deleteMany();
    const vinculos = await tx.controleBuffetAmostraItemServico.deleteMany();
    const itens = await tx.controleBuffetAmostraItem.deleteMany();
    const servicos = await tx.controleBuffetAmostraServico.deleteMany();
    const acoesCorretivas = await tx.controleBuffetAmostraAcaoCorretiva.deleteMany();

    const servico = await tx.controleBuffetAmostraServico.create({
      data: {
        nome: SERVICE_NAME,
        ativo: true,
        ordem: 1
      }
    });

    const acoesCorretivasCriadas = await tx.controleBuffetAmostraAcaoCorretiva.createMany({
      data: DEFAULT_CORRECTIVE_ACTIONS.map((action) => ({
        ...action,
        ativo: true
      }))
    });

    let itensCriados = 0;
    let vinculosCriados = 0;

    for (const itemConfig of BREAKFAST_ITEMS) {
      const item = await tx.controleBuffetAmostraItem.create({
        data: {
          ...itemConfig,
          ativo: true
        }
      });

      itensCriados += 1;

      await tx.controleBuffetAmostraItemServico.create({
        data: {
          servicoId: servico.id,
          itemId: item.id
        }
      });

      vinculosCriados += 1;
    }

    return {
      removidos: {
        registros: registros.count,
        fechamentos: fechamentos.count,
        vinculos: vinculos.count,
        itens: itens.count,
        servicos: servicos.count,
        acoesCorretivas: acoesCorretivas.count
      },
      criados: {
        servicos: 1,
        acoesCorretivas: acoesCorretivasCriadas.count,
        itens: itensCriados,
        vinculos: vinculosCriados
      }
    };
  });

  console.log("Reset do Controle de Buffet / Amostras concluído.");
  console.log("Registros removidos:");
  console.log(`- registros diários: ${result.removidos.registros}`);
  console.log(`- fechamentos mensais: ${result.removidos.fechamentos}`);
  console.log(`- vínculos item-serviço: ${result.removidos.vinculos}`);
  console.log(`- itens cadastrados: ${result.removidos.itens}`);
  console.log(`- serviços cadastrados: ${result.removidos.servicos}`);
  console.log(`- ações corretivas: ${result.removidos.acoesCorretivas}`);
  console.log("Registros criados:");
  console.log(`- serviços: ${result.criados.servicos}`);
  console.log(`- ações corretivas: ${result.criados.acoesCorretivas}`);
  console.log(`- itens padrão: ${result.criados.itens}`);
  console.log(`- vínculos item-serviço: ${result.criados.vinculos}`);
}

main()
  .catch((error) => {
    console.error("Falha ao resetar o Controle de Buffet / Amostras.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
