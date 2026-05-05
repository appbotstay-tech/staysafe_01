ALTER TABLE "controle_buffet_amostra_registro"
ADD COLUMN "itemExtra" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "controle_buffet_amostra_registro"
ALTER COLUMN "itemId" DROP NOT NULL;

CREATE INDEX "controle_buffet_amostra_registro_itemExtra_idx"
ON "controle_buffet_amostra_registro"("itemExtra");
