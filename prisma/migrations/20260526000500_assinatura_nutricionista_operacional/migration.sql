ALTER TYPE "TipoAssinaturaSistema" ADD VALUE IF NOT EXISTS 'REVISAO_NUTRICIONISTA';

ALTER TABLE "controle_buffet_amostra_registro"
ADD COLUMN "assinaturaNutricionistaUsuarioId" INTEGER,
ADD COLUMN "assinaturaNutricionistaNome" TEXT,
ADD COLUMN "assinaturaNutricionistaPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaNutricionistaDataHora" TIMESTAMP(3);

CREATE INDEX "controle_buffet_amostra_registro_assinaturaNutricionistaDataHora_idx"
ON "controle_buffet_amostra_registro"("assinaturaNutricionistaDataHora");

ALTER TABLE "controle_temperatura_equipamentos"
ADD COLUMN "assinaturaNutricionistaUsuarioId" INTEGER,
ADD COLUMN "assinaturaNutricionistaNome" TEXT,
ADD COLUMN "assinaturaNutricionistaPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaNutricionistaDataHora" TIMESTAMP(3);

CREATE INDEX "controle_temperatura_equipamentos_assinaturaNutricionistaDataHora_idx"
ON "controle_temperatura_equipamentos"("assinaturaNutricionistaDataHora");
