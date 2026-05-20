-- AlterTable
ALTER TABLE "documento_tecnico_anexo" ADD COLUMN "todosModulos" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documento_tecnico_anexo" ALTER COLUMN "modulo" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "documento_tecnico_anexo_todosModulos_ativo_idx" ON "documento_tecnico_anexo"("todosModulos", "ativo");

-- CreateTable
CREATE TABLE "modulo_configuracao" (
    "id" SERIAL NOT NULL,
    "modulo" "ModuloDocumento" NOT NULL,
    "textoCabecalho" TEXT,
    "atualizadoPorUsuarioId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modulo_configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modulo_configuracao_modulo_key" ON "modulo_configuracao"("modulo");

-- CreateIndex
CREATE INDEX "modulo_configuracao_atualizadoPorUsuarioId_idx" ON "modulo_configuracao"("atualizadoPorUsuarioId");

-- AddForeignKey
ALTER TABLE "modulo_configuracao" ADD CONSTRAINT "modulo_configuracao_atualizadoPorUsuarioId_fkey" FOREIGN KEY ("atualizadoPorUsuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
