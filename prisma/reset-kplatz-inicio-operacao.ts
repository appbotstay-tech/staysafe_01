// ATENÇÃO: script destrutivo de início de operação K-Platz.
// Limpa dados de teste e recria cadastros oficiais do cliente, incluindo bases.
// Execute manualmente apenas com BPMA_CONFIRM_RESET_KPLATZ=SIM.
import "dotenv/config";

import { ClassificacaoItemBuffetAmostra, PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const CONFIRMATION_ENV = "BPMA_CONFIRM_RESET_KPLATZ";
const CONFIRMATION_VALUE = "SIM";

const OFFICIAL_USERS = [
  { nomeCompleto: "Cediane Santos", nomeUsuario: "cediane.santos", perfil: "GERENTE" },
  { nomeCompleto: "Tainara Goulart", nomeUsuario: "tainara.goulart", perfil: "GERENTE" },
  { nomeCompleto: "Maíra Sidrim", nomeUsuario: "maira.sidrim", perfil: "GERENTE" },
  { nomeCompleto: "Camila Reinaldo", nomeUsuario: "camila.reinaldo", perfil: "NUTRICIONISTA" },
  {
    nomeCompleto: "Anderson Fiorenzano",
    nomeUsuario: "anderson.fiorenzano",
    perfil: "COLABORADOR"
  }
] as const;

const BREAKFAST_SERVICE_NAME = "Café da Manhã";

const BUFFET_CORRECTIVE_ACTIONS = [
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

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(8))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password.trim(), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function resetBuffetCatalog(tx: Tx) {
  const vinculos = await tx.controleBuffetAmostraItemServico.deleteMany();
  const itens = await tx.controleBuffetAmostraItem.deleteMany();
  const servicos = await tx.controleBuffetAmostraServico.deleteMany();
  const acoes = await tx.controleBuffetAmostraAcaoCorretiva.deleteMany();

  const servico = await tx.controleBuffetAmostraServico.create({
    data: { nome: BREAKFAST_SERVICE_NAME, ativo: true, ordem: 1 }
  });

  const acoesCriadas = await tx.controleBuffetAmostraAcaoCorretiva.createMany({
    data: BUFFET_CORRECTIVE_ACTIONS.map((item) => ({ ...item, ativo: true }))
  });

  let itensCriados = 0;
  let vinculosCriados = 0;

  for (const itemConfig of BREAKFAST_ITEMS) {
    const item = await tx.controleBuffetAmostraItem.create({
      data: { ...itemConfig, ativo: true }
    });
    itensCriados += 1;

    await tx.controleBuffetAmostraItemServico.create({
      data: { servicoId: servico.id, itemId: item.id }
    });
    vinculosCriados += 1;
  }

  return {
    removidos: {
      vinculos: vinculos.count,
      itens: itens.count,
      servicos: servicos.count,
      acoes: acoes.count
    },
    criados: {
      servicos: 1,
      acoes: acoesCriadas.count,
      itens: itensCriados,
      vinculos: vinculosCriados
    }
  };
}

async function ensureOfficialUsers(tx: Tx) {
  const generatedPasswords: Array<{ nomeCompleto: string; nomeUsuario: string; senha: string }> = [];
  const officialNames = new Set(OFFICIAL_USERS.map((user) => normalize(user.nomeCompleto)));

  const dev =
    (await tx.usuario.findFirst({
      where: { OR: [{ isDevDefinitivo: true }, { perfil: "DEV" }, { nomeUsuario: "dev" }] },
      select: { id: true, nomeUsuario: true }
    })) ?? null;

  if (dev) {
    await tx.usuario.update({
      where: { id: dev.id },
      data: {
        nomeCompleto: "Dev",
        perfil: "DEV",
        status: "ATIVO",
        isDevDefinitivo: true,
        obrigarTrocaSenha: false
      }
    });
  } else {
    const senha = generateTemporaryPassword();
    await tx.usuario.create({
      data: {
        nomeCompleto: "Dev",
        nomeUsuario: "dev",
        senhaHash: hashPassword(senha),
        perfil: "DEV",
        status: "ATIVO",
        isDevDefinitivo: true,
        obrigarTrocaSenha: true,
        ultimaAlteracaoSenha: new Date(),
        observacoesInternas: "Usuário DEV criado pelo reset seguro KPlatz."
      }
    });
    generatedPasswords.push({ nomeCompleto: "Dev", nomeUsuario: "dev", senha });
  }

  const existingUsers = await tx.usuario.findMany({
    select: { id: true, nomeCompleto: true, nomeUsuario: true, isDevDefinitivo: true }
  });
  const preserveIds = existingUsers
    .filter(
      (user) =>
        user.isDevDefinitivo ||
        officialNames.has(normalize(user.nomeCompleto)) ||
        OFFICIAL_USERS.some((official) => official.nomeUsuario === user.nomeUsuario)
    )
    .map((user) => user.id);

  const removedUsers = await tx.usuario.deleteMany({
    where: {
      ...(preserveIds.length > 0 ? { id: { notIn: preserveIds } } : {}),
      isDevDefinitivo: false,
      perfil: { not: "DEV" }
    }
  });

  for (const officialUser of OFFICIAL_USERS) {
    const byName = await tx.usuario.findFirst({
      where: { nomeCompleto: { equals: officialUser.nomeCompleto, mode: "insensitive" } },
      select: { id: true }
    });
    const byUsername = await tx.usuario.findUnique({
      where: { nomeUsuario: officialUser.nomeUsuario },
      select: { id: true }
    });
    const target = byName ?? byUsername;

    if (target) {
      await tx.usuario.update({
        where: { id: target.id },
        data: {
          nomeCompleto: officialUser.nomeCompleto,
          nomeUsuario: officialUser.nomeUsuario,
          perfil: officialUser.perfil,
          status: "ATIVO",
          isDevDefinitivo: false
        }
      });
      continue;
    }

    const senha = generateTemporaryPassword();
    await tx.usuario.create({
      data: {
        nomeCompleto: officialUser.nomeCompleto,
        nomeUsuario: officialUser.nomeUsuario,
        senhaHash: hashPassword(senha),
        perfil: officialUser.perfil,
        status: "ATIVO",
        obrigarTrocaSenha: true,
        ultimaAlteracaoSenha: new Date()
      }
    });
    generatedPasswords.push({
      nomeCompleto: officialUser.nomeCompleto,
      nomeUsuario: officialUser.nomeUsuario,
      senha
    });
  }

  return { removedUsers: removedUsers.count, generatedPasswords };
}

async function main() {
  if (process.env[CONFIRMATION_ENV] !== CONFIRMATION_VALUE) {
    console.error(
      "Operação cancelada. Defina BPMA_CONFIRM_RESET_KPLATZ=SIM para confirmar a limpeza dos dados de teste."
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const deleted = {
          sessoes: (await tx.usuarioSessao.deleteMany()).count,
          solicitacoesSenha: (await tx.solicitacaoRedefinicaoSenha.deleteMany()).count,
          logsAssinatura: (await tx.logAssinatura.deleteMany()).count,
          chamados: (await tx.chamadoManutencao.deleteMany()).count,
          buffetRegistros: (await tx.controleBuffetAmostraRegistro.deleteMany()).count,
          buffetFechamentos: (await tx.controleBuffetAmostraFechamento.deleteMany()).count,
          planoSemanalExecucoes: (await tx.planoLimpezaSemanalExecucao.deleteMany()).count,
          planoLimpezaDiarioRegistros: (await tx.planoLimpezaDiarioRegistro.deleteMany()).count,
          planoLimpezaFechamentos: (await tx.planoLimpezaFechamento.deleteMany()).count,
          rastreabilidadeRegistros: (await tx.rastreabilidadeRecebimentoRegistro.deleteMany())
            .count,
          rastreabilidadeNotas: (await tx.rastreabilidadeRecebimentoNota.deleteMany()).count,
          rastreabilidadeFechamentos: (await tx.rastreabilidadeRecebimentoFechamento.deleteMany())
            .count,
          oleoRegistros: (await tx.controleQualidadeOleoRegistro.deleteMany()).count,
          oleoFechamentos: (await tx.controleQualidadeOleoFechamento.deleteMany()).count,
          temperaturaRegistros: (await tx.controleTemperaturaEquipamento.deleteMany()).count,
          temperaturaFechamentos: (await tx.controleTemperaturaEquipamentoFechamento.deleteMany())
            .count,
          hortifrutiRegistros: (await tx.higienizacaoHortifruti.deleteMany()).count,
          hortifrutiFechamentos: (await tx.higienizacaoHortifrutiFechamento.deleteMany()).count,
          registrosIniciais: (await tx.registroInicial.deleteMany()).count
        };

        const buffet = await resetBuffetCatalog(tx);
        const users = await ensureOfficialUsers(tx);

        return { deleted, buffet, users };
      },
      { timeout: 120_000 }
    );

    console.log("Reset seguro KPlatz concluído.");
    console.log("Dados operacionais removidos:");
    for (const [name, count] of Object.entries(result.deleted)) {
      console.log(`- ${name}: ${count}`);
    }
    console.log("Catálogo oficial de Buffet / Amostras recriado:");
    console.log(`- serviço: ${BREAKFAST_SERVICE_NAME}`);
    console.log(`- itens: ${result.buffet.criados.itens}`);
    console.log(`- ações corretivas: ${result.buffet.criados.acoes}`);
    console.log(`- vínculos item-serviço: ${result.buffet.criados.vinculos}`);
    console.log(`Usuários de teste removidos: ${result.users.removedUsers}`);

    if (result.users.generatedPasswords.length > 0) {
      console.log("Senhas temporárias geradas para usuários criados agora:");
      for (const item of result.users.generatedPasswords) {
        console.log(`- ${item.nomeCompleto} (${item.nomeUsuario}): ${item.senha}`);
      }
    } else {
      console.log("Nenhum usuário novo exigiu geração de senha temporária.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error("Falha ao executar reset seguro KPlatz.");
    console.error(error);
    process.exitCode = 1;
  });
