CREATE TYPE "StatusOperacionalEquipamento" AS ENUM ('EM_OPERACAO', 'MANUTENCAO', 'INATIVO');

ALTER TABLE "controle_temperatura_equipamentos"
ADD COLUMN "statusOperacionalEquipamento" "StatusOperacionalEquipamento" NOT NULL DEFAULT 'EM_OPERACAO',
ADD COLUMN "observacaoStatusOperacional" TEXT,
ALTER COLUMN "temperaturaAferida" DROP NOT NULL;

CREATE INDEX "controle_temperatura_equipamentos_statusOperacionalEquipamento_idx"
ON "controle_temperatura_equipamentos"("statusOperacionalEquipamento");
