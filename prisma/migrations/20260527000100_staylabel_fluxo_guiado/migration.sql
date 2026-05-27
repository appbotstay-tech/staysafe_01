-- Nova estrutura DEV do StayLabel baseada em grupo, produto, metodo/conservacao e regra de validade.
-- As tabelas antigas do modulo foram mantidas como legado para evitar migration destrutiva.

CREATE TYPE "EtiquetaValidadeOrigemRegra" AS ENUM ('AUTOMATICA', 'MANUAL');

CREATE TABLE "etiqueta_validade_grupo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "grupoPaiId" INTEGER,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_grupo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "etiqueta_validade_produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "unidadePadrao" TEXT NOT NULL,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_produto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "etiqueta_validade_produto_grupo" (
    "produtoId" INTEGER NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etiqueta_validade_produto_grupo_pkey" PRIMARY KEY ("produtoId", "grupoId")
);

CREATE TABLE "etiqueta_validade_metodo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_metodo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "etiqueta_validade_regra" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER,
    "grupoId" INTEGER,
    "metodoId" INTEGER NOT NULL,
    "validadeDias" INTEGER,
    "validadeHoras" INTEGER,
    "exigeValidadeManual" BOOLEAN NOT NULL DEFAULT false,
    "temperaturaReferencia" TEXT,
    "observacao" TEXT,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_regra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "etiqueta_validade_emissao" (
    "id" SERIAL NOT NULL,
    "codigoEtiqueta" TEXT NOT NULL,
    "produtoId" INTEGER,
    "grupoId" INTEGER,
    "subgrupoId" INTEGER,
    "metodoId" INTEGER,
    "regraValidadeId" INTEGER,
    "produtoNomeSnapshot" TEXT NOT NULL,
    "grupoNomeSnapshot" TEXT,
    "subgrupoNomeSnapshot" TEXT,
    "metodoNomeSnapshot" TEXT NOT NULL,
    "validadeDiasSnapshot" INTEGER,
    "validadeHorasSnapshot" INTEGER,
    "temperaturaReferenciaSnapshot" TEXT,
    "quantidade" TEXT,
    "unidadeSnapshot" TEXT NOT NULL,
    "dataManipulacao" DATE NOT NULL,
    "horaManipulacao" TEXT NOT NULL,
    "dataValidade" DATE NOT NULL,
    "horaValidade" TEXT NOT NULL,
    "responsavelUsuarioId" INTEGER NOT NULL,
    "responsavelNomeSnapshot" TEXT NOT NULL,
    "responsavelPerfilSnapshot" "PerfilUsuario" NOT NULL,
    "marcaFornecedor" TEXT,
    "sif" TEXT,
    "lote" TEXT,
    "validadeOriginal" DATE,
    "observacao" TEXT,
    "origem" "EtiquetaValidadeOrigemRegra" NOT NULL DEFAULT 'AUTOMATICA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etiqueta_validade_emissao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "etiqueta_validade_grupo_nome_key" ON "etiqueta_validade_grupo"("nome");
CREATE INDEX "etiqueta_validade_grupo_grupoPaiId_ativo_ordem_idx" ON "etiqueta_validade_grupo"("grupoPaiId", "ativo", "ordem");
CREATE INDEX "etiqueta_validade_grupo_ativo_ordem_nome_idx" ON "etiqueta_validade_grupo"("ativo", "ordem", "nome");

CREATE UNIQUE INDEX "etiqueta_validade_produto_nome_key" ON "etiqueta_validade_produto"("nome");
CREATE INDEX "etiqueta_validade_produto_ativo_nome_idx" ON "etiqueta_validade_produto"("ativo", "nome");

CREATE INDEX "etiqueta_validade_produto_grupo_grupoId_idx" ON "etiqueta_validade_produto_grupo"("grupoId");

CREATE UNIQUE INDEX "etiqueta_validade_metodo_nome_key" ON "etiqueta_validade_metodo"("nome");
CREATE INDEX "etiqueta_validade_metodo_ativo_ordem_nome_idx" ON "etiqueta_validade_metodo"("ativo", "ordem", "nome");

CREATE INDEX "etiqueta_validade_regra_produtoId_metodoId_ativo_idx" ON "etiqueta_validade_regra"("produtoId", "metodoId", "ativo");
CREATE INDEX "etiqueta_validade_regra_grupoId_metodoId_ativo_idx" ON "etiqueta_validade_regra"("grupoId", "metodoId", "ativo");
CREATE INDEX "etiqueta_validade_regra_metodoId_ativo_idx" ON "etiqueta_validade_regra"("metodoId", "ativo");
CREATE INDEX "etiqueta_validade_regra_ativo_prioridade_idx" ON "etiqueta_validade_regra"("ativo", "prioridade");

CREATE UNIQUE INDEX "etiqueta_validade_emissao_codigoEtiqueta_key" ON "etiqueta_validade_emissao"("codigoEtiqueta");
CREATE INDEX "etiqueta_validade_emissao_produtoId_idx" ON "etiqueta_validade_emissao"("produtoId");
CREATE INDEX "etiqueta_validade_emissao_grupoId_idx" ON "etiqueta_validade_emissao"("grupoId");
CREATE INDEX "etiqueta_validade_emissao_subgrupoId_idx" ON "etiqueta_validade_emissao"("subgrupoId");
CREATE INDEX "etiqueta_validade_emissao_metodoId_idx" ON "etiqueta_validade_emissao"("metodoId");
CREATE INDEX "etiqueta_validade_emissao_regraValidadeId_idx" ON "etiqueta_validade_emissao"("regraValidadeId");
CREATE INDEX "etiqueta_validade_emissao_responsavelUsuarioId_idx" ON "etiqueta_validade_emissao"("responsavelUsuarioId");
CREATE INDEX "etiqueta_validade_emissao_dataValidade_idx" ON "etiqueta_validade_emissao"("dataValidade");
CREATE INDEX "etiqueta_validade_emissao_criadoEm_idx" ON "etiqueta_validade_emissao"("criadoEm");
CREATE INDEX "etiqueta_validade_emissao_origem_idx" ON "etiqueta_validade_emissao"("origem");

ALTER TABLE "etiqueta_validade_grupo"
ADD CONSTRAINT "etiqueta_validade_grupo_grupoPaiId_fkey"
FOREIGN KEY ("grupoPaiId") REFERENCES "etiqueta_validade_grupo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_produto_grupo"
ADD CONSTRAINT "etiqueta_validade_produto_grupo_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "etiqueta_validade_produto"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_produto_grupo"
ADD CONSTRAINT "etiqueta_validade_produto_grupo_grupoId_fkey"
FOREIGN KEY ("grupoId") REFERENCES "etiqueta_validade_grupo"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_regra"
ADD CONSTRAINT "etiqueta_validade_regra_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "etiqueta_validade_produto"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_regra"
ADD CONSTRAINT "etiqueta_validade_regra_grupoId_fkey"
FOREIGN KEY ("grupoId") REFERENCES "etiqueta_validade_grupo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_regra"
ADD CONSTRAINT "etiqueta_validade_regra_metodoId_fkey"
FOREIGN KEY ("metodoId") REFERENCES "etiqueta_validade_metodo"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "etiqueta_validade_produto"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_grupoId_fkey"
FOREIGN KEY ("grupoId") REFERENCES "etiqueta_validade_grupo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_subgrupoId_fkey"
FOREIGN KEY ("subgrupoId") REFERENCES "etiqueta_validade_grupo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_metodoId_fkey"
FOREIGN KEY ("metodoId") REFERENCES "etiqueta_validade_metodo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_regraValidadeId_fkey"
FOREIGN KEY ("regraValidadeId") REFERENCES "etiqueta_validade_regra"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_emissao"
ADD CONSTRAINT "etiqueta_validade_emissao_responsavelUsuarioId_fkey"
FOREIGN KEY ("responsavelUsuarioId") REFERENCES "usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
