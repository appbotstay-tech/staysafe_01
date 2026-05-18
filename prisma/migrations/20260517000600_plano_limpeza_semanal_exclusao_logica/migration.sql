-- Plano de Limpeza Semanal: exclusão lógica para preservar histórico operacional.
ALTER TABLE "plano_limpeza_semanal_item"
ADD COLUMN "excluidoEm" TIMESTAMP(3);

ALTER TABLE "plano_limpeza_semanal_area"
ADD COLUMN "excluidoEm" TIMESTAMP(3);

CREATE INDEX "plano_limpeza_semanal_item_excluidoEm_idx"
ON "plano_limpeza_semanal_item"("excluidoEm");

CREATE INDEX "plano_limpeza_semanal_area_excluidoEm_idx"
ON "plano_limpeza_semanal_area"("excluidoEm");
