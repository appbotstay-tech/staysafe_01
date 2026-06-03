ALTER TABLE "controle_temperatura_equipamentos"
ADD COLUMN "fotoUrl" TEXT,
ADD COLUMN "fotoTamanhoBytes" INTEGER,
ADD COLUMN "fotoCriadoEm" TIMESTAMP(3),
ADD COLUMN "fotoCriadoPorUsuarioId" INTEGER;
