-- Plano de Limpeza Semanal: gestão própria de áreas e setor responsável.
ALTER TABLE "plano_limpeza_semanal_item"
ADD COLUMN "setorResponsavel" TEXT;

CREATE TABLE "plano_limpeza_semanal_area" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plano_limpeza_semanal_area_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plano_limpeza_semanal_area_nome_key"
ON "plano_limpeza_semanal_area"("nome");

CREATE INDEX "plano_limpeza_semanal_area_ativo_ordem_nome_idx"
ON "plano_limpeza_semanal_area"("ativo", "ordem", "nome");

INSERT INTO "plano_limpeza_semanal_area" ("nome", "ativo", "ordem", "createdAt", "updatedAt")
VALUES
  ('Cozinha Central', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Açougue', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Área de Hortifruti', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Área de Louças', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Confeitarias', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Garde Manger', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Bar Lobby e Restaurante', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Ático', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Room Service', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Refeitório', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Almoxarifado de Bebidas', true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Almoxarifado', true, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Bar', true, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Restaurante', true, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Cozinha Fria', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Gard Manger', true, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Estoque', true, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Pista fria', true, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Bancadas', true, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Prateleiras', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Lixeiras', true, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Piso, paredes e teto', true, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nome") DO NOTHING;

INSERT INTO "plano_limpeza_semanal_area" ("nome", "ativo", "ordem", "createdAt", "updatedAt")
SELECT DISTINCT item."area", true, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "plano_limpeza_semanal_item" item
WHERE TRIM(item."area") <> ''
ON CONFLICT ("nome") DO NOTHING;
