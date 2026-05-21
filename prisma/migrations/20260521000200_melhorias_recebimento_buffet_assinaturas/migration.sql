CREATE TYPE "TipoTemperaturaRecebimento" AS ENUM (
  'NUMERICA',
  'AMBIENTE',
  'NAO_APLICAVEL'
);

ALTER TABLE "rastreabilidade_recebimento_registro"
ADD COLUMN "validadeNaoAplicavel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "temperaturaTipo" "TipoTemperaturaRecebimento" NOT NULL DEFAULT 'NUMERICA';

ALTER TABLE "controle_buffet_amostra_servico"
ADD COLUMN "observacao" TEXT;

ALTER TABLE "plano_limpeza_diario_registro"
ADD COLUMN "assinaturaResponsavelUsuarioId" INTEGER,
ADD COLUMN "assinaturaResponsavelNomeUsuario" TEXT,
ADD COLUMN "assinaturaResponsavelPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaResponsavelDataHora" TIMESTAMP(3),
ADD COLUMN "assinaturaSupervisorUsuarioId" INTEGER,
ADD COLUMN "assinaturaSupervisorNomeUsuario" TEXT,
ADD COLUMN "assinaturaSupervisorPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaSupervisorDataHora" TIMESTAMP(3);

CREATE INDEX "plano_limpeza_diario_registro_assinaturaResponsavelDataHora_idx"
ON "plano_limpeza_diario_registro"("assinaturaResponsavelDataHora");

CREATE INDEX "plano_limpeza_diario_registro_assinaturaSupervisorDataHora_idx"
ON "plano_limpeza_diario_registro"("assinaturaSupervisorDataHora");
