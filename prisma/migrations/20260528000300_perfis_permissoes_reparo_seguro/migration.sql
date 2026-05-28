-- Reparo idempotente para ambientes que receberam o código de RBAC antes da
-- migration base ou ficaram com a estrutura parcialmente aplicada.
-- Mantém usuários/sessões existentes e preserva o campo legado "perfil".

ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "perfilAcessoId" INTEGER;

CREATE TABLE IF NOT EXISTS "perfil_acesso" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "sistemaPadrao" BOOLEAN NOT NULL DEFAULT false,
  "perfilLegado" "PerfilUsuario",
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "perfil_acesso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "permissao" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "grupo" TEXT NOT NULL,
  "modulo" TEXT,
  "acao" TEXT NOT NULL,
  "sensivel" BOOLEAN NOT NULL DEFAULT false,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "perfil_permissao" (
  "id" SERIAL NOT NULL,
  "perfilId" INTEGER NOT NULL,
  "permissaoId" INTEGER NOT NULL,
  "permitido" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "perfil_permissao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "perfil_permissao_auditoria" (
  "id" SERIAL NOT NULL,
  "perfilId" INTEGER NOT NULL,
  "perfilCodigo" TEXT NOT NULL,
  "alteradoPorId" INTEGER,
  "alteradoPorNome" TEXT,
  "permissoesAntes" JSONB NOT NULL,
  "permissoesDepois" JSONB NOT NULL,
  "resumo" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "perfil_permissao_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "perfil_acesso_codigo_key" ON "perfil_acesso"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "perfil_acesso_perfilLegado_key" ON "perfil_acesso"("perfilLegado");
CREATE INDEX IF NOT EXISTS "perfil_acesso_ativo_codigo_idx" ON "perfil_acesso"("ativo", "codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "permissao_codigo_key" ON "permissao"("codigo");
CREATE INDEX IF NOT EXISTS "permissao_grupo_modulo_acao_idx" ON "permissao"("grupo", "modulo", "acao");
CREATE INDEX IF NOT EXISTS "permissao_sensivel_idx" ON "permissao"("sensivel");
CREATE UNIQUE INDEX IF NOT EXISTS "perfil_permissao_perfilId_permissaoId_key" ON "perfil_permissao"("perfilId", "permissaoId");
CREATE INDEX IF NOT EXISTS "perfil_permissao_permissaoId_permitido_idx" ON "perfil_permissao"("permissaoId", "permitido");
CREATE INDEX IF NOT EXISTS "perfil_permissao_auditoria_perfilId_criadoEm_idx" ON "perfil_permissao_auditoria"("perfilId", "criadoEm");
CREATE INDEX IF NOT EXISTS "perfil_permissao_auditoria_alteradoPorId_criadoEm_idx" ON "perfil_permissao_auditoria"("alteradoPorId", "criadoEm");
CREATE INDEX IF NOT EXISTS "usuario_perfilAcessoId_idx" ON "usuario"("perfilAcessoId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_perfilAcessoId_fkey') THEN
    ALTER TABLE "usuario"
    ADD CONSTRAINT "usuario_perfilAcessoId_fkey"
    FOREIGN KEY ("perfilAcessoId") REFERENCES "perfil_acesso"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perfil_permissao_perfilId_fkey') THEN
    ALTER TABLE "perfil_permissao"
    ADD CONSTRAINT "perfil_permissao_perfilId_fkey"
    FOREIGN KEY ("perfilId") REFERENCES "perfil_acesso"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perfil_permissao_permissaoId_fkey') THEN
    ALTER TABLE "perfil_permissao"
    ADD CONSTRAINT "perfil_permissao_permissaoId_fkey"
    FOREIGN KEY ("permissaoId") REFERENCES "permissao"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perfil_permissao_auditoria_perfilId_fkey') THEN
    ALTER TABLE "perfil_permissao_auditoria"
    ADD CONSTRAINT "perfil_permissao_auditoria_perfilId_fkey"
    FOREIGN KEY ("perfilId") REFERENCES "perfil_acesso"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "perfil_acesso" (
  "nome",
  "codigo",
  "descricao",
  "ativo",
  "sistemaPadrao",
  "perfilLegado",
  "criadoEm",
  "atualizadoEm"
) VALUES
  ('DEV', 'DEV', 'Perfil técnico com acesso total ao sistema.', true, true, 'DEV'::"PerfilUsuario", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Gerente', 'GERENTE', 'Perfil padrão de gestão operacional.', true, true, 'GERENTE'::"PerfilUsuario", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Nutricionista', 'NUTRICIONISTA', 'Perfil padrão de supervisão técnica e segurança alimentar.', true, true, 'NUTRICIONISTA'::"PerfilUsuario", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Colaborador', 'COLABORADOR', 'Perfil padrão para execução operacional do dia.', true, true, 'COLABORADOR'::"PerfilUsuario", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO UPDATE SET
  "sistemaPadrao" = true,
  "perfilLegado" = EXCLUDED."perfilLegado",
  "atualizadoEm" = CURRENT_TIMESTAMP;

WITH permission_codes("codigo") AS (
  VALUES
    ('dashboard.acessar'),
    ('usuarios.acessar'),
    ('usuarios.criar'),
    ('usuarios.editar'),
    ('usuarios.desativar'),
    ('usuarios.redefinir_senha'),
    ('usuarios.editar_propria_senha'),
    ('usuarios.criar_perfil'),
    ('usuarios.editar_perfil'),
    ('usuarios.editar_permissoes'),
    ('usuarios.desativar_perfil'),
    ('sistema.configuracoes'),
    ('sistema.ver_logs'),
    ('sistema.executar_reset'),
    ('sistema.acesso_dev'),
    ('modulo.hortifruti.acessar'),
    ('modulo.hortifruti.criar_registro'),
    ('modulo.hortifruti.editar_registro_do_dia'),
    ('modulo.hortifruti.editar_historico'),
    ('modulo.hortifruti.excluir_registro'),
    ('modulo.hortifruti.gerenciar_cadastros'),
    ('modulo.hortifruti.fechar_mes'),
    ('modulo.hortifruti.reabrir_mes'),
    ('modulo.amostras.acessar'),
    ('modulo.amostras.acessar_historico'),
    ('modulo.amostras.criar_registro'),
    ('modulo.amostras.editar_registro_do_dia'),
    ('modulo.amostras.editar_historico'),
    ('modulo.amostras.excluir_registro'),
    ('modulo.amostras.assinar_servico'),
    ('modulo.amostras.assinar_historico'),
    ('modulo.amostras.gerenciar_cadastros'),
    ('modulo.amostras.fechar_mes'),
    ('modulo.amostras.reabrir_mes'),
    ('modulo.temperatura.acessar'),
    ('modulo.temperatura.acessar_historico'),
    ('modulo.temperatura.criar_registro'),
    ('modulo.temperatura.editar_registro_do_dia'),
    ('modulo.temperatura.editar_historico'),
    ('modulo.temperatura.excluir_registro'),
    ('modulo.temperatura.assinar_historico'),
    ('modulo.temperatura.gerenciar_cadastros'),
    ('modulo.temperatura.fechar_mes'),
    ('modulo.temperatura.reabrir_mes'),
    ('modulo.oleo.acessar'),
    ('modulo.oleo.acessar_historico'),
    ('modulo.oleo.criar_registro'),
    ('modulo.oleo.editar_registro_do_dia'),
    ('modulo.oleo.editar_historico'),
    ('modulo.oleo.excluir_registro'),
    ('modulo.oleo.assinar_historico'),
    ('modulo.oleo.gerenciar_cadastros'),
    ('modulo.oleo.fechar_mes'),
    ('modulo.oleo.reabrir_mes'),
    ('modulo.rastreabilidade.acessar'),
    ('modulo.rastreabilidade.acessar_historico'),
    ('modulo.rastreabilidade.criar_registro'),
    ('modulo.rastreabilidade.editar_registro_do_dia'),
    ('modulo.rastreabilidade.editar_historico'),
    ('modulo.rastreabilidade.excluir_registro'),
    ('modulo.rastreabilidade.gerenciar_configuracoes'),
    ('modulo.rastreabilidade.fechar_mes'),
    ('modulo.rastreabilidade.reabrir_mes'),
    ('modulo.limpeza_diaria.acessar'),
    ('modulo.limpeza_diaria.acessar_historico'),
    ('modulo.limpeza_diaria.criar_registro'),
    ('modulo.limpeza_diaria.editar_registro_do_dia'),
    ('modulo.limpeza_diaria.editar_historico'),
    ('modulo.limpeza_diaria.assinar_todos'),
    ('modulo.limpeza_diaria.assinar_historico'),
    ('modulo.limpeza_diaria.gerenciar_cadastros'),
    ('modulo.limpeza_diaria.fechar_mes'),
    ('modulo.limpeza_diaria.reabrir_mes'),
    ('modulo.limpeza_semanal.acessar'),
    ('modulo.limpeza_semanal.acessar_historico'),
    ('modulo.limpeza_semanal.criar_registro'),
    ('modulo.limpeza_semanal.editar_registro_do_dia'),
    ('modulo.limpeza_semanal.editar_historico'),
    ('modulo.limpeza_semanal.assinar_todos'),
    ('modulo.limpeza_semanal.assinar_historico'),
    ('modulo.limpeza_semanal.gerenciar_cadastros'),
    ('modulo.limpeza_semanal.fechar_mes'),
    ('modulo.limpeza_semanal.reabrir_mes'),
    ('modulo.chamados.acessar'),
    ('modulo.chamados.criar_registro'),
    ('modulo.chamados.editar_registro_do_dia'),
    ('modulo.chamados.editar_historico'),
    ('modulo.chamados.gerenciar_cadastros'),
    ('modulo.documentos.acessar'),
    ('modulo.documentos.gerenciar_anexos'),
    ('modulo.relatorios.acessar'),
    ('modulo.relatorios.gerenciar_configuracoes'),
    ('modulo.etiquetas.acessar'),
    ('modulo.etiquetas.acessar_historico'),
    ('modulo.etiquetas.criar_registro'),
    ('modulo.etiquetas.editar_registro_do_dia'),
    ('modulo.etiquetas.editar_historico'),
    ('modulo.etiquetas.gerenciar_cadastros')
)
INSERT INTO "permissao" ("codigo", "nome", "descricao", "grupo", "modulo", "acao", "sensivel", "criadoEm", "atualizadoEm")
SELECT
  permission_codes."codigo",
  permission_codes."codigo",
  NULL,
  CASE
    WHEN permission_codes."codigo" LIKE 'dashboard.%' THEN 'Dashboard'
    WHEN permission_codes."codigo" LIKE 'usuarios.%' THEN 'Gestão de Usuários'
    WHEN permission_codes."codigo" LIKE 'sistema.%' THEN 'Sistema'
    ELSE split_part(permission_codes."codigo", '.', 2)
  END,
  CASE
    WHEN permission_codes."codigo" LIKE 'modulo.%' THEN split_part(permission_codes."codigo", '.', 2)
    ELSE split_part(permission_codes."codigo", '.', 1)
  END,
  regexp_replace(permission_codes."codigo", '^.*\.', ''),
  permission_codes."codigo" IN (
    'usuarios.editar_permissoes',
    'usuarios.criar_perfil',
    'usuarios.editar_perfil',
    'usuarios.desativar_perfil',
    'usuarios.redefinir_senha',
    'sistema.executar_reset',
    'sistema.acesso_dev',
    'sistema.configuracoes'
  )
  OR permission_codes."codigo" LIKE '%.editar_historico'
  OR permission_codes."codigo" LIKE '%.excluir_registro'
  OR permission_codes."codigo" LIKE '%.reabrir_mes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM permission_codes
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
CROSS JOIN "permissao" permissao
WHERE perfil."codigo" = 'DEV'
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;

WITH colaborador_codes("codigo") AS (
  VALUES
    ('dashboard.acessar'), ('usuarios.editar_propria_senha'),
    ('modulo.hortifruti.acessar'), ('modulo.hortifruti.criar_registro'), ('modulo.hortifruti.editar_registro_do_dia'),
    ('modulo.amostras.acessar'), ('modulo.amostras.criar_registro'), ('modulo.amostras.editar_registro_do_dia'),
    ('modulo.temperatura.acessar'), ('modulo.temperatura.criar_registro'), ('modulo.temperatura.editar_registro_do_dia'),
    ('modulo.oleo.acessar'), ('modulo.oleo.criar_registro'), ('modulo.oleo.editar_registro_do_dia'),
    ('modulo.rastreabilidade.acessar'), ('modulo.rastreabilidade.criar_registro'), ('modulo.rastreabilidade.editar_registro_do_dia'),
    ('modulo.limpeza_diaria.acessar'), ('modulo.limpeza_diaria.criar_registro'), ('modulo.limpeza_diaria.editar_registro_do_dia'),
    ('modulo.limpeza_semanal.acessar'), ('modulo.limpeza_semanal.criar_registro'), ('modulo.limpeza_semanal.editar_registro_do_dia'),
    ('modulo.chamados.acessar'), ('modulo.chamados.criar_registro')
)
INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN colaborador_codes ON true
JOIN "permissao" permissao ON permissao."codigo" = colaborador_codes."codigo"
WHERE perfil."codigo" = 'COLABORADOR'
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;

WITH nutricionista_codes("codigo") AS (
  VALUES
    ('dashboard.acessar'), ('usuarios.editar_propria_senha'),
    ('modulo.hortifruti.acessar'), ('modulo.hortifruti.criar_registro'), ('modulo.hortifruti.editar_registro_do_dia'), ('modulo.hortifruti.excluir_registro'), ('modulo.hortifruti.fechar_mes'),
    ('modulo.amostras.acessar'), ('modulo.amostras.acessar_historico'), ('modulo.amostras.criar_registro'), ('modulo.amostras.editar_registro_do_dia'), ('modulo.amostras.excluir_registro'), ('modulo.amostras.assinar_servico'), ('modulo.amostras.assinar_historico'), ('modulo.amostras.fechar_mes'),
    ('modulo.temperatura.acessar'), ('modulo.temperatura.acessar_historico'), ('modulo.temperatura.criar_registro'), ('modulo.temperatura.editar_registro_do_dia'), ('modulo.temperatura.excluir_registro'), ('modulo.temperatura.assinar_historico'), ('modulo.temperatura.fechar_mes'),
    ('modulo.oleo.acessar'), ('modulo.oleo.acessar_historico'), ('modulo.oleo.criar_registro'), ('modulo.oleo.editar_registro_do_dia'), ('modulo.oleo.excluir_registro'), ('modulo.oleo.assinar_historico'), ('modulo.oleo.fechar_mes'),
    ('modulo.rastreabilidade.acessar'), ('modulo.rastreabilidade.acessar_historico'), ('modulo.rastreabilidade.criar_registro'), ('modulo.rastreabilidade.editar_registro_do_dia'), ('modulo.rastreabilidade.fechar_mes'),
    ('modulo.limpeza_diaria.acessar'), ('modulo.limpeza_diaria.acessar_historico'), ('modulo.limpeza_diaria.criar_registro'), ('modulo.limpeza_diaria.editar_registro_do_dia'), ('modulo.limpeza_diaria.assinar_todos'), ('modulo.limpeza_diaria.assinar_historico'), ('modulo.limpeza_diaria.fechar_mes'),
    ('modulo.limpeza_semanal.acessar'), ('modulo.limpeza_semanal.acessar_historico'), ('modulo.limpeza_semanal.criar_registro'), ('modulo.limpeza_semanal.editar_registro_do_dia'), ('modulo.limpeza_semanal.assinar_todos'), ('modulo.limpeza_semanal.assinar_historico'), ('modulo.limpeza_semanal.fechar_mes'),
    ('modulo.chamados.acessar'), ('modulo.chamados.criar_registro'), ('modulo.chamados.editar_registro_do_dia'), ('modulo.chamados.editar_historico'),
    ('modulo.documentos.acessar'), ('modulo.relatorios.acessar')
)
INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN nutricionista_codes ON true
JOIN "permissao" permissao ON permissao."codigo" = nutricionista_codes."codigo"
WHERE perfil."codigo" = 'NUTRICIONISTA'
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;

WITH gerente_codes("codigo") AS (
  VALUES
    ('dashboard.acessar'), ('usuarios.editar_propria_senha'), ('usuarios.acessar'), ('usuarios.criar'), ('usuarios.editar'), ('usuarios.desativar'), ('usuarios.redefinir_senha'),
    ('modulo.hortifruti.acessar'), ('modulo.hortifruti.criar_registro'), ('modulo.hortifruti.editar_registro_do_dia'), ('modulo.hortifruti.excluir_registro'), ('modulo.hortifruti.gerenciar_cadastros'), ('modulo.hortifruti.fechar_mes'),
    ('modulo.amostras.acessar'), ('modulo.amostras.acessar_historico'), ('modulo.amostras.criar_registro'), ('modulo.amostras.editar_registro_do_dia'), ('modulo.amostras.excluir_registro'), ('modulo.amostras.assinar_servico'), ('modulo.amostras.assinar_historico'), ('modulo.amostras.gerenciar_cadastros'), ('modulo.amostras.fechar_mes'),
    ('modulo.temperatura.acessar'), ('modulo.temperatura.acessar_historico'), ('modulo.temperatura.criar_registro'), ('modulo.temperatura.editar_registro_do_dia'), ('modulo.temperatura.excluir_registro'), ('modulo.temperatura.assinar_historico'), ('modulo.temperatura.gerenciar_cadastros'), ('modulo.temperatura.fechar_mes'),
    ('modulo.oleo.acessar'), ('modulo.oleo.acessar_historico'), ('modulo.oleo.criar_registro'), ('modulo.oleo.editar_registro_do_dia'), ('modulo.oleo.excluir_registro'), ('modulo.oleo.assinar_historico'), ('modulo.oleo.gerenciar_cadastros'), ('modulo.oleo.fechar_mes'),
    ('modulo.rastreabilidade.acessar'), ('modulo.rastreabilidade.acessar_historico'), ('modulo.rastreabilidade.criar_registro'), ('modulo.rastreabilidade.editar_registro_do_dia'), ('modulo.rastreabilidade.gerenciar_configuracoes'), ('modulo.rastreabilidade.fechar_mes'),
    ('modulo.limpeza_diaria.acessar'), ('modulo.limpeza_diaria.acessar_historico'), ('modulo.limpeza_diaria.criar_registro'), ('modulo.limpeza_diaria.editar_registro_do_dia'), ('modulo.limpeza_diaria.assinar_todos'), ('modulo.limpeza_diaria.assinar_historico'), ('modulo.limpeza_diaria.gerenciar_cadastros'), ('modulo.limpeza_diaria.fechar_mes'),
    ('modulo.limpeza_semanal.acessar'), ('modulo.limpeza_semanal.acessar_historico'), ('modulo.limpeza_semanal.criar_registro'), ('modulo.limpeza_semanal.editar_registro_do_dia'), ('modulo.limpeza_semanal.assinar_todos'), ('modulo.limpeza_semanal.assinar_historico'), ('modulo.limpeza_semanal.gerenciar_cadastros'), ('modulo.limpeza_semanal.fechar_mes'),
    ('modulo.chamados.acessar'), ('modulo.chamados.criar_registro'), ('modulo.chamados.editar_registro_do_dia'), ('modulo.chamados.editar_historico'), ('modulo.chamados.gerenciar_cadastros'),
    ('modulo.documentos.acessar'), ('modulo.documentos.gerenciar_anexos'), ('modulo.relatorios.acessar'), ('modulo.relatorios.gerenciar_configuracoes')
)
INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN gerente_codes ON true
JOIN "permissao" permissao ON permissao."codigo" = gerente_codes."codigo"
WHERE perfil."codigo" = 'GERENTE'
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;

UPDATE "usuario" usuario
SET "perfilAcessoId" = perfil.id
FROM "perfil_acesso" perfil
WHERE usuario."perfilAcessoId" IS NULL
  AND perfil."perfilLegado" = usuario."perfil";
