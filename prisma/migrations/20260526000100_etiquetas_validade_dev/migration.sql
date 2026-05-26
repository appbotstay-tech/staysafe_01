-- CreateTable
CREATE TABLE "etiqueta_validade_classificacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "validadeDias" INTEGER NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_classificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiqueta_validade_item" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "classificacaoId" INTEGER NOT NULL,
    "marcaFornecedor" TEXT,
    "unidadePadrao" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiqueta_validade_gerada" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "nomeItemSnapshot" TEXT NOT NULL,
    "classificacaoId" INTEGER NOT NULL,
    "nomeClassificacaoSnapshot" TEXT NOT NULL,
    "validadeDiasSnapshot" INTEGER NOT NULL,
    "dataManipulacao" DATE NOT NULL,
    "horaManipulacao" TEXT,
    "dataValidade" DATE NOT NULL,
    "horaValidade" TEXT,
    "responsavelUsuarioId" INTEGER NOT NULL,
    "responsavelNomeSnapshot" TEXT NOT NULL,
    "marcaFornecedorSnapshot" TEXT,
    "sif" TEXT,
    "lote" TEXT,
    "quantidadePeso" TEXT,
    "observacao" TEXT,
    "codigoEtiqueta" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etiqueta_validade_gerada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiqueta_validade_configuracao_impressao" (
    "id" SERIAL NOT NULL,
    "larguraMm" INTEGER NOT NULL DEFAULT 80,
    "alturaMm" INTEGER NOT NULL DEFAULT 50,
    "margemMm" INTEGER NOT NULL DEFAULT 3,
    "tamanhoFonte" INTEGER NOT NULL DEFAULT 11,
    "mostrarQrCode" BOOLEAN NOT NULL DEFAULT false,
    "mostrarSif" BOOLEAN NOT NULL DEFAULT true,
    "mostrarLote" BOOLEAN NOT NULL DEFAULT true,
    "mostrarMarcaFornecedor" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etiqueta_validade_configuracao_impressao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etiqueta_validade_classificacao_nome_key" ON "etiqueta_validade_classificacao"("nome");

-- CreateIndex
CREATE INDEX "etiqueta_validade_classificacao_ativo_nome_idx" ON "etiqueta_validade_classificacao"("ativo", "nome");

-- CreateIndex
CREATE INDEX "etiqueta_validade_item_classificacaoId_idx" ON "etiqueta_validade_item"("classificacaoId");

-- CreateIndex
CREATE INDEX "etiqueta_validade_item_ativo_nome_idx" ON "etiqueta_validade_item"("ativo", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "etiqueta_validade_gerada_codigoEtiqueta_key" ON "etiqueta_validade_gerada"("codigoEtiqueta");

-- CreateIndex
CREATE INDEX "etiqueta_validade_gerada_itemId_idx" ON "etiqueta_validade_gerada"("itemId");

-- CreateIndex
CREATE INDEX "etiqueta_validade_gerada_classificacaoId_idx" ON "etiqueta_validade_gerada"("classificacaoId");

-- CreateIndex
CREATE INDEX "etiqueta_validade_gerada_responsavelUsuarioId_idx" ON "etiqueta_validade_gerada"("responsavelUsuarioId");

-- CreateIndex
CREATE INDEX "etiqueta_validade_gerada_dataValidade_idx" ON "etiqueta_validade_gerada"("dataValidade");

-- CreateIndex
CREATE INDEX "etiqueta_validade_gerada_criadoEm_idx" ON "etiqueta_validade_gerada"("criadoEm");

-- AddForeignKey
ALTER TABLE "etiqueta_validade_item" ADD CONSTRAINT "etiqueta_validade_item_classificacaoId_fkey" FOREIGN KEY ("classificacaoId") REFERENCES "etiqueta_validade_classificacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiqueta_validade_gerada" ADD CONSTRAINT "etiqueta_validade_gerada_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "etiqueta_validade_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiqueta_validade_gerada" ADD CONSTRAINT "etiqueta_validade_gerada_classificacaoId_fkey" FOREIGN KEY ("classificacaoId") REFERENCES "etiqueta_validade_classificacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiqueta_validade_gerada" ADD CONSTRAINT "etiqueta_validade_gerada_responsavelUsuarioId_fkey" FOREIGN KEY ("responsavelUsuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
