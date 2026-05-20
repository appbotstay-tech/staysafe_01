-- CreateEnum
CREATE TYPE "DocumentoTipo" AS ENUM ('LEGISLACAO', 'LAUDO', 'POP_MANUAL');

-- CreateEnum
CREATE TYPE "ModuloDocumento" AS ENUM ('DASHBOARD_RESUMO_BPMA', 'HIGIENIZACAO_HORTIFRUTI', 'CONTROLE_TEMPERATURA', 'CONTROLE_QUALIDADE_OLEO', 'RASTREABILIDADE_RECEBIMENTO', 'CONTROLE_BUFFET_AMOSTRAS', 'PLANO_LIMPEZA_DIARIO', 'PLANO_LIMPEZA_SEMANAL', 'CHAMADOS_MANUTENCAO', 'RELATORIOS_AUDITORIA');

-- CreateTable
CREATE TABLE "documento_tecnico_anexo" (
    "id" SERIAL NOT NULL,
    "modulo" "ModuloDocumento" NOT NULL,
    "tipo" "DocumentoTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "legislacaoResumo" TEXT,
    "dataEmissao" DATE,
    "dataValidade" DATE,
    "observacoes" TEXT,
    "arquivoNome" TEXT NOT NULL,
    "arquivoMimeType" TEXT NOT NULL,
    "arquivoTamanho" INTEGER NOT NULL,
    "arquivoConteudo" BYTEA NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorUsuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_tecnico_anexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_tecnico_anexo_modulo_tipo_ativo_idx" ON "documento_tecnico_anexo"("modulo", "tipo", "ativo");

-- CreateIndex
CREATE INDEX "documento_tecnico_anexo_tipo_ativo_idx" ON "documento_tecnico_anexo"("tipo", "ativo");

-- CreateIndex
CREATE INDEX "documento_tecnico_anexo_dataValidade_idx" ON "documento_tecnico_anexo"("dataValidade");

-- CreateIndex
CREATE INDEX "documento_tecnico_anexo_criadoPorUsuarioId_idx" ON "documento_tecnico_anexo"("criadoPorUsuarioId");

-- AddForeignKey
ALTER TABLE "documento_tecnico_anexo" ADD CONSTRAINT "documento_tecnico_anexo_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
