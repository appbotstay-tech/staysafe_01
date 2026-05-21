-- Plano de Limpeza Semanal: ciclo semanal por item assinado.
ALTER TABLE "plano_limpeza_semanal_item"
ALTER COLUMN "quando" DROP NOT NULL;

ALTER TABLE "plano_limpeza_semanal_execucao"
ADD COLUMN "assinaturaResponsavelUsuarioId" INTEGER,
ADD COLUMN "assinaturaResponsavelNomeUsuario" TEXT,
ADD COLUMN "assinaturaResponsavelPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaResponsavelDataHora" TIMESTAMP(3),
ADD COLUMN "assinaturaSupervisorUsuarioId" INTEGER,
ADD COLUMN "assinaturaSupervisorNomeUsuario" TEXT,
ADD COLUMN "assinaturaSupervisorPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaSupervisorDataHora" TIMESTAMP(3);

CREATE INDEX "plano_limpeza_semanal_execucao_assinaturaResponsavelDataHora_idx"
ON "plano_limpeza_semanal_execucao"("assinaturaResponsavelDataHora");

CREATE INDEX "plano_limpeza_semanal_execucao_assinaturaSupervisorDataHora_idx"
ON "plano_limpeza_semanal_execucao"("assinaturaSupervisorDataHora");
