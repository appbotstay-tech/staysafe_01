ALTER TABLE "controle_qualidade_oleo_registro"
ADD COLUMN "assinaturaSupervisorUsuarioId" INTEGER,
ADD COLUMN "assinaturaSupervisorNome" TEXT,
ADD COLUMN "assinaturaSupervisorPerfil" "PerfilUsuario",
ADD COLUMN "assinaturaSupervisorEm" TIMESTAMP(3);

CREATE INDEX "controle_qualidade_oleo_registro_assinaturaSupervisorEm_idx"
ON "controle_qualidade_oleo_registro"("assinaturaSupervisorEm");
