CREATE TYPE "PerfilUsuario_new" AS ENUM ('DEV', 'GERENTE', 'NUTRICIONISTA', 'COLABORADOR');

ALTER TABLE "usuario"
  ALTER COLUMN "perfil" TYPE "PerfilUsuario_new"
  USING (
    CASE "perfil"::text
      WHEN 'DEV' THEN 'DEV'
      WHEN 'GESTOR' THEN 'GERENTE'
      WHEN 'SUPERVISOR' THEN 'NUTRICIONISTA'
      WHEN 'RESPONSAVEL_TECNICO' THEN 'NUTRICIONISTA'
      WHEN 'FUNCIONARIO' THEN 'COLABORADOR'
      ELSE 'COLABORADOR'
    END
  )::"PerfilUsuario_new";

ALTER TABLE "log_assinatura"
  ALTER COLUMN "perfil" TYPE "PerfilUsuario_new"
  USING (
    CASE "perfil"::text
      WHEN 'DEV' THEN 'DEV'
      WHEN 'GESTOR' THEN 'GERENTE'
      WHEN 'SUPERVISOR' THEN 'NUTRICIONISTA'
      WHEN 'RESPONSAVEL_TECNICO' THEN 'NUTRICIONISTA'
      WHEN 'FUNCIONARIO' THEN 'COLABORADOR'
      ELSE 'COLABORADOR'
    END
  )::"PerfilUsuario_new";

ALTER TABLE "controle_buffet_amostra_registro"
  ALTER COLUMN "responsavelPerfil" TYPE "PerfilUsuario_new"
  USING (
    CASE "responsavelPerfil"::text
      WHEN 'DEV' THEN 'DEV'
      WHEN 'GESTOR' THEN 'GERENTE'
      WHEN 'SUPERVISOR' THEN 'NUTRICIONISTA'
      WHEN 'RESPONSAVEL_TECNICO' THEN 'NUTRICIONISTA'
      WHEN 'FUNCIONARIO' THEN 'COLABORADOR'
      ELSE 'COLABORADOR'
    END
  )::"PerfilUsuario_new",
  ALTER COLUMN "assinaturaPerfil" TYPE "PerfilUsuario_new"
  USING (
    CASE "assinaturaPerfil"::text
      WHEN 'DEV' THEN 'DEV'
      WHEN 'GESTOR' THEN 'GERENTE'
      WHEN 'SUPERVISOR' THEN 'NUTRICIONISTA'
      WHEN 'RESPONSAVEL_TECNICO' THEN 'NUTRICIONISTA'
      WHEN 'FUNCIONARIO' THEN 'COLABORADOR'
      ELSE NULL
    END
  )::"PerfilUsuario_new";

ALTER TABLE "chamado_manutencao"
  ALTER COLUMN "assinaturaAberturaPerfil" TYPE "PerfilUsuario_new"
  USING (
    CASE "assinaturaAberturaPerfil"::text
      WHEN 'DEV' THEN 'DEV'
      WHEN 'GESTOR' THEN 'GERENTE'
      WHEN 'SUPERVISOR' THEN 'NUTRICIONISTA'
      WHEN 'RESPONSAVEL_TECNICO' THEN 'NUTRICIONISTA'
      WHEN 'FUNCIONARIO' THEN 'COLABORADOR'
      ELSE 'COLABORADOR'
    END
  )::"PerfilUsuario_new";

DROP TYPE "PerfilUsuario";
ALTER TYPE "PerfilUsuario_new" RENAME TO "PerfilUsuario";
