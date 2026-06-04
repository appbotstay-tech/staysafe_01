ALTER TABLE "controle_temperatura_equipamentos_opcao"
ADD COLUMN "turnoManha" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "turnoTarde" BOOLEAN NOT NULL DEFAULT true;
