ALTER TYPE "ClassificacaoItemBuffetAmostra" RENAME TO "ClassificacaoItemBuffetAmostra_old";

CREATE TYPE "ClassificacaoItemBuffetAmostra" AS ENUM (
  'QUENTE',
  'FRIO',
  'TEMPERATURA_AMBIENTE'
);

ALTER TABLE "controle_buffet_amostra_item"
  ALTER COLUMN "classificacao" TYPE "ClassificacaoItemBuffetAmostra"
  USING (
    CASE
      WHEN "classificacao"::text = 'FRIO_CRU' THEN 'FRIO'
      ELSE "classificacao"::text
    END
  )::"ClassificacaoItemBuffetAmostra";

ALTER TABLE "controle_buffet_amostra_registro"
  ALTER COLUMN "classificacao" TYPE "ClassificacaoItemBuffetAmostra"
  USING (
    CASE
      WHEN "classificacao"::text = 'FRIO_CRU' THEN 'FRIO'
      ELSE "classificacao"::text
    END
  )::"ClassificacaoItemBuffetAmostra";

DROP TYPE "ClassificacaoItemBuffetAmostra_old";
