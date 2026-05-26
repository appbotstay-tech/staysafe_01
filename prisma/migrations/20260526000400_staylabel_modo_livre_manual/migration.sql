CREATE TYPE "EtiquetaValidadeOrigem" AS ENUM ('CADASTRADO', 'LIVRE');

ALTER TABLE "etiqueta_validade_classificacao"
ADD COLUMN "condicaoArmazenamento" TEXT,
ADD COLUMN "temperaturaConservacao" TEXT,
ADD COLUMN "observacaoNormativa" TEXT;

ALTER TABLE "etiqueta_validade_gerada" DROP CONSTRAINT "etiqueta_validade_gerada_itemId_fkey";
ALTER TABLE "etiqueta_validade_gerada" DROP CONSTRAINT "etiqueta_validade_gerada_classificacaoId_fkey";

ALTER TABLE "etiqueta_validade_gerada"
ADD COLUMN "origem" "EtiquetaValidadeOrigem" NOT NULL DEFAULT 'CADASTRADO',
ALTER COLUMN "itemId" DROP NOT NULL,
ALTER COLUMN "classificacaoId" DROP NOT NULL,
ALTER COLUMN "validadeDiasSnapshot" DROP NOT NULL;

ALTER TABLE "etiqueta_validade_gerada"
ADD CONSTRAINT "etiqueta_validade_gerada_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "etiqueta_validade_item"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "etiqueta_validade_gerada"
ADD CONSTRAINT "etiqueta_validade_gerada_classificacaoId_fkey"
FOREIGN KEY ("classificacaoId") REFERENCES "etiqueta_validade_classificacao"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
