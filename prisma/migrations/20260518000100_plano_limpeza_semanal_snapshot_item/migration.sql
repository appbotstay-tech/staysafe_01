-- Plano de Limpeza Semanal: snapshot dos dados do item na execução.
ALTER TABLE "plano_limpeza_semanal_execucao"
ADD COLUMN "itemDescricao" TEXT,
ADD COLUMN "qualProduto" TEXT,
ADD COLUMN "quando" TEXT,
ADD COLUMN "setorResponsavel" TEXT,
ADD COLUMN "funcionarioResponsavel" TEXT;

UPDATE "plano_limpeza_semanal_execucao" execucao
SET
  "itemDescricao" = item."oQueLimpar",
  "qualProduto" = item."qualProduto",
  "quando" = item."quando",
  "setorResponsavel" = item."setorResponsavel",
  "funcionarioResponsavel" = item."quem"
FROM "plano_limpeza_semanal_item" item
WHERE execucao."itemId" = item."id";
