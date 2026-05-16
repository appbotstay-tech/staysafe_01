ALTER TABLE "rastreabilidade_recebimento_registro"
ADD COLUMN "codigoProdutoXml" TEXT,
ADD COLUMN "ncm" TEXT,
ADD COLUMN "cfop" TEXT,
ADD COLUMN "quantidadeComprada" DOUBLE PRECISION,
ADD COLUMN "unidadeMedidaCompra" TEXT,
ADD COLUMN "valorUnitario" DOUBLE PRECISION,
ADD COLUMN "valorTotalItem" DOUBLE PRECISION,
ADD COLUMN "quantidadeTributavel" DOUBLE PRECISION,
ADD COLUMN "unidadeMedidaTributavel" TEXT,
ADD COLUMN "valorUnitarioTributavel" DOUBLE PRECISION;
