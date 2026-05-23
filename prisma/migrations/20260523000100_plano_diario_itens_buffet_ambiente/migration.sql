CREATE TABLE "plano_limpeza_diario_item" (
  "id" SERIAL NOT NULL,
  "areaId" INTEGER NOT NULL,
  "descricao" TEXT NOT NULL,
  "produtoUtilizado" TEXT,
  "setorResponsavel" TEXT,
  "funcionarioResponsavel" TEXT,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "excluidoEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plano_limpeza_diario_item_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "plano_limpeza_diario_registro"
  ADD COLUMN "itemId" INTEGER,
  ADD COLUMN "itemDescricao" TEXT,
  ADD COLUMN "produtoUtilizado" TEXT,
  ADD COLUMN "setorResponsavel" TEXT,
  ADD COLUMN "funcionarioResponsavel" TEXT;

ALTER TABLE "controle_buffet_amostra_registro"
  ADD COLUMN "temperaturaAmbiente" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "plano_limpeza_diario_item_areaId_idx" ON "plano_limpeza_diario_item"("areaId");
CREATE INDEX "plano_limpeza_diario_item_excluidoEm_idx" ON "plano_limpeza_diario_item"("excluidoEm");
CREATE INDEX "plano_limpeza_diario_item_areaId_ativo_ordem_idx" ON "plano_limpeza_diario_item"("areaId", "ativo", "ordem");
CREATE INDEX "plano_limpeza_diario_registro_itemId_idx" ON "plano_limpeza_diario_registro"("itemId");
CREATE UNIQUE INDEX "plano_limpeza_diario_registro_data_turno_itemId_key" ON "plano_limpeza_diario_registro"("data", "turno", "itemId");

ALTER TABLE "plano_limpeza_diario_item"
  ADD CONSTRAINT "plano_limpeza_diario_item_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "plano_limpeza_diario_area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plano_limpeza_diario_registro"
  ADD CONSTRAINT "plano_limpeza_diario_registro_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "plano_limpeza_diario_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
