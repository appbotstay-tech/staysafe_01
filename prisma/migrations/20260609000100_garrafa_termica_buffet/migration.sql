ALTER TABLE "controle_buffet_amostra_item"
  ADD COLUMN "usaGarrafaTermica" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "controle_buffet_amostra_registro"
  ADD COLUMN "usaGarrafaTermica" BOOLEAN NOT NULL DEFAULT false;

UPDATE "controle_buffet_amostra_item"
SET "usaGarrafaTermica" = true
WHERE lower("nome") IN ('café', 'cafe', 'leite quente');

UPDATE "controle_buffet_amostra_registro" registro
SET
  "usaGarrafaTermica" = true,
  "tcEquipamento" = NULL
FROM "controle_buffet_amostra_item" item
WHERE registro."itemId" = item."id"
  AND item."usaGarrafaTermica" = true;

UPDATE "controle_buffet_amostra_registro"
SET
  "usaGarrafaTermica" = true,
  "tcEquipamento" = NULL
WHERE "itemId" IS NULL
  AND lower("itemNome") IN ('café', 'cafe', 'leite quente');
