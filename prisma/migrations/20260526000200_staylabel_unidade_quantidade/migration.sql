-- Rename item fixed unit field and make it required with a safe fallback.
ALTER TABLE "etiqueta_validade_item" RENAME COLUMN "unidadePadrao" TO "unidadeMedidaPadrao";

UPDATE "etiqueta_validade_item"
SET "unidadeMedidaPadrao" = 'unidade'
WHERE "unidadeMedidaPadrao" IS NULL OR btrim("unidadeMedidaPadrao") = '';

ALTER TABLE "etiqueta_validade_item" ALTER COLUMN "unidadeMedidaPadrao" SET NOT NULL;

-- Item no longer stores fixed brand/supplier. This remains a per-label emission field.
ALTER TABLE "etiqueta_validade_item" DROP COLUMN "marcaFornecedor";

-- Split the generated-label quantity snapshot from the unit snapshot.
ALTER TABLE "etiqueta_validade_gerada" RENAME COLUMN "quantidadePeso" TO "quantidade";

ALTER TABLE "etiqueta_validade_gerada" ADD COLUMN "unidadeMedidaSnapshot" TEXT NOT NULL DEFAULT 'unidade';

UPDATE "etiqueta_validade_gerada" AS etiqueta
SET "unidadeMedidaSnapshot" = item."unidadeMedidaPadrao"
FROM "etiqueta_validade_item" AS item
WHERE etiqueta."itemId" = item."id";

ALTER TABLE "etiqueta_validade_gerada" ALTER COLUMN "unidadeMedidaSnapshot" DROP DEFAULT;
