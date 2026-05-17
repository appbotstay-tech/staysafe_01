CREATE TYPE "TipoServicoBuffetAmostra" AS ENUM ('FIXO', 'ESPORADICO');

ALTER TABLE "controle_buffet_amostra_servico"
  ADD COLUMN "tipoServico" "TipoServicoBuffetAmostra" NOT NULL DEFAULT 'FIXO',
  ADD COLUMN "dataInicio" DATE,
  ADD COLUMN "dataFim" DATE;

CREATE INDEX "controle_buffet_amostra_servico_tipoServico_dataInicio_dataFim_idx"
  ON "controle_buffet_amostra_servico"("tipoServico", "dataInicio", "dataFim");
