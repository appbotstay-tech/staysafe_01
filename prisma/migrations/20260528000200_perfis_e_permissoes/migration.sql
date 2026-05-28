ALTER TABLE "usuario" ADD COLUMN "perfilAcessoId" INTEGER;

CREATE TABLE "perfil_acesso" (
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

CREATE TABLE "permissao" (
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

CREATE TABLE "perfil_permissao" (
  "id" SERIAL NOT NULL,
  "perfilId" INTEGER NOT NULL,
  "permissaoId" INTEGER NOT NULL,
  "permitido" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "perfil_permissao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "perfil_permissao_auditoria" (
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

CREATE UNIQUE INDEX "perfil_acesso_codigo_key" ON "perfil_acesso"("codigo");
CREATE UNIQUE INDEX "perfil_acesso_perfilLegado_key" ON "perfil_acesso"("perfilLegado");
CREATE INDEX "perfil_acesso_ativo_codigo_idx" ON "perfil_acesso"("ativo", "codigo");

CREATE UNIQUE INDEX "permissao_codigo_key" ON "permissao"("codigo");
CREATE INDEX "permissao_grupo_modulo_acao_idx" ON "permissao"("grupo", "modulo", "acao");
CREATE INDEX "permissao_sensivel_idx" ON "permissao"("sensivel");

CREATE UNIQUE INDEX "perfil_permissao_perfilId_permissaoId_key" ON "perfil_permissao"("perfilId", "permissaoId");
CREATE INDEX "perfil_permissao_permissaoId_permitido_idx" ON "perfil_permissao"("permissaoId", "permitido");

CREATE INDEX "perfil_permissao_auditoria_perfilId_criadoEm_idx" ON "perfil_permissao_auditoria"("perfilId", "criadoEm");
CREATE INDEX "perfil_permissao_auditoria_alteradoPorId_criadoEm_idx" ON "perfil_permissao_auditoria"("alteradoPorId", "criadoEm");

CREATE INDEX "usuario_perfilAcessoId_idx" ON "usuario"("perfilAcessoId");

ALTER TABLE "usuario"
ADD CONSTRAINT "usuario_perfilAcessoId_fkey"
FOREIGN KEY ("perfilAcessoId") REFERENCES "perfil_acesso"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "perfil_permissao"
ADD CONSTRAINT "perfil_permissao_perfilId_fkey"
FOREIGN KEY ("perfilId") REFERENCES "perfil_acesso"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "perfil_permissao"
ADD CONSTRAINT "perfil_permissao_permissaoId_fkey"
FOREIGN KEY ("permissaoId") REFERENCES "permissao"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "perfil_permissao_auditoria"
ADD CONSTRAINT "perfil_permissao_auditoria_perfilId_fkey"
FOREIGN KEY ("perfilId") REFERENCES "perfil_acesso"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

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
  ('Colaborador', 'COLABORADOR', 'Perfil padrão para execução operacional do dia.', true, true, 'COLABORADOR'::"PerfilUsuario", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "permissao" (
  "codigo",
  "nome",
  "descricao",
  "grupo",
  "modulo",
  "acao",
  "sensivel",
  "criadoEm",
  "atualizadoEm"
) VALUES
  ('dashboard.acessar', 'Acessar Dashboard', NULL, 'Dashboard', 'dashboard', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.acessar', 'Acessar Gestão de Usuários', NULL, 'Gestão de Usuários', 'usuarios', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.criar', 'Criar usuários', NULL, 'Gestão de Usuários', 'usuarios', 'criar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.editar', 'Editar usuários', NULL, 'Gestão de Usuários', 'usuarios', 'editar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.desativar', 'Ativar ou desativar usuários', NULL, 'Gestão de Usuários', 'usuarios', 'desativar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.redefinir_senha', 'Redefinir senha de usuários', NULL, 'Gestão de Usuários', 'usuarios', 'redefinir_senha', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.editar_propria_senha', 'Alterar própria senha', NULL, 'Gestão de Usuários', 'usuarios', 'editar_propria_senha', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.criar_perfil', 'Criar perfis', NULL, 'Perfis e Permissões', 'usuarios', 'criar_perfil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.editar_perfil', 'Editar perfis', NULL, 'Perfis e Permissões', 'usuarios', 'editar_perfil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.editar_permissoes', 'Editar permissões', NULL, 'Perfis e Permissões', 'usuarios', 'editar_permissoes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('usuarios.desativar_perfil', 'Desativar perfis', NULL, 'Perfis e Permissões', 'usuarios', 'desativar_perfil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sistema.configuracoes', 'Configurações do sistema', NULL, 'Sistema', 'sistema', 'configuracoes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sistema.ver_logs', 'Ver logs', NULL, 'Sistema', 'sistema', 'ver_logs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sistema.executar_reset', 'Executar resets', NULL, 'Sistema', 'sistema', 'executar_reset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sistema.acesso_dev', 'Acesso DEV', NULL, 'Sistema', 'sistema', 'acesso_dev', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.acessar', 'Acessar módulo', NULL, 'Higienização de Hortifruti', 'hortifruti', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.criar_registro', 'Criar registro', NULL, 'Higienização de Hortifruti', 'hortifruti', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Higienização de Hortifruti', 'hortifruti', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.editar_historico', 'Editar registros históricos', NULL, 'Higienização de Hortifruti', 'hortifruti', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.excluir_registro', 'Excluir registros', NULL, 'Higienização de Hortifruti', 'hortifruti', 'excluir_registro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Higienização de Hortifruti', 'hortifruti', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.fechar_mes', 'Fechar mês', NULL, 'Higienização de Hortifruti', 'hortifruti', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.hortifruti.reabrir_mes', 'Reabrir mês', NULL, 'Higienização de Hortifruti', 'hortifruti', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.acessar', 'Acessar módulo', NULL, 'Amostras / Controle de Buffet', 'amostras', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.acessar_historico', 'Acessar histórico', NULL, 'Amostras / Controle de Buffet', 'amostras', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.criar_registro', 'Criar registro', NULL, 'Amostras / Controle de Buffet', 'amostras', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Amostras / Controle de Buffet', 'amostras', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.editar_historico', 'Editar registros históricos', NULL, 'Amostras / Controle de Buffet', 'amostras', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.excluir_registro', 'Excluir registros', NULL, 'Amostras / Controle de Buffet', 'amostras', 'excluir_registro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.assinar_servico', 'Assinar serviço', NULL, 'Amostras / Controle de Buffet', 'amostras', 'assinar_servico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.assinar_historico', 'Assinar históricos', NULL, 'Amostras / Controle de Buffet', 'amostras', 'assinar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Amostras / Controle de Buffet', 'amostras', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.fechar_mes', 'Fechar mês', NULL, 'Amostras / Controle de Buffet', 'amostras', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.amostras.reabrir_mes', 'Reabrir mês', NULL, 'Amostras / Controle de Buffet', 'amostras', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.acessar', 'Acessar módulo', NULL, 'Temperatura de Equipamentos', 'temperatura', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.acessar_historico', 'Acessar histórico', NULL, 'Temperatura de Equipamentos', 'temperatura', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.criar_registro', 'Criar registro', NULL, 'Temperatura de Equipamentos', 'temperatura', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Temperatura de Equipamentos', 'temperatura', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.editar_historico', 'Editar registros históricos', NULL, 'Temperatura de Equipamentos', 'temperatura', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.excluir_registro', 'Excluir registros', NULL, 'Temperatura de Equipamentos', 'temperatura', 'excluir_registro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.assinar_historico', 'Assinar históricos', NULL, 'Temperatura de Equipamentos', 'temperatura', 'assinar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Temperatura de Equipamentos', 'temperatura', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.fechar_mes', 'Fechar mês', NULL, 'Temperatura de Equipamentos', 'temperatura', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.temperatura.reabrir_mes', 'Reabrir mês', NULL, 'Temperatura de Equipamentos', 'temperatura', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.acessar', 'Acessar módulo', NULL, 'Qualidade do Óleo', 'oleo', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.acessar_historico', 'Acessar histórico', NULL, 'Qualidade do Óleo', 'oleo', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.criar_registro', 'Criar registro', NULL, 'Qualidade do Óleo', 'oleo', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Qualidade do Óleo', 'oleo', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.editar_historico', 'Editar registros históricos', NULL, 'Qualidade do Óleo', 'oleo', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.excluir_registro', 'Excluir registros', NULL, 'Qualidade do Óleo', 'oleo', 'excluir_registro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.assinar_historico', 'Assinar históricos', NULL, 'Qualidade do Óleo', 'oleo', 'assinar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Qualidade do Óleo', 'oleo', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.fechar_mes', 'Fechar mês', NULL, 'Qualidade do Óleo', 'oleo', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.oleo.reabrir_mes', 'Reabrir mês', NULL, 'Qualidade do Óleo', 'oleo', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.acessar', 'Acessar módulo', NULL, 'Rastreabilidade', 'rastreabilidade', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.acessar_historico', 'Acessar histórico', NULL, 'Rastreabilidade', 'rastreabilidade', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.criar_registro', 'Criar registro', NULL, 'Rastreabilidade', 'rastreabilidade', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Rastreabilidade', 'rastreabilidade', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.editar_historico', 'Editar registros históricos', NULL, 'Rastreabilidade', 'rastreabilidade', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.excluir_registro', 'Excluir registros', NULL, 'Rastreabilidade', 'rastreabilidade', 'excluir_registro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.gerenciar_configuracoes', 'Gerenciar configurações', NULL, 'Rastreabilidade', 'rastreabilidade', 'gerenciar_configuracoes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.fechar_mes', 'Fechar mês', NULL, 'Rastreabilidade', 'rastreabilidade', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.rastreabilidade.reabrir_mes', 'Reabrir mês', NULL, 'Rastreabilidade', 'rastreabilidade', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.acessar', 'Acessar módulo', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.acessar_historico', 'Acessar histórico', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.criar_registro', 'Criar registro', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.editar_historico', 'Editar registros históricos', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.assinar_todos', 'Assinar todos', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'assinar_todos', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.assinar_historico', 'Assinar históricos', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'assinar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.fechar_mes', 'Fechar mês', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_diaria.reabrir_mes', 'Reabrir mês', NULL, 'Plano de Limpeza Diário', 'limpeza_diaria', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.acessar', 'Acessar módulo', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.acessar_historico', 'Acessar histórico', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.criar_registro', 'Criar registro', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.editar_historico', 'Editar registros históricos', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.assinar_todos', 'Assinar todos', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'assinar_todos', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.assinar_historico', 'Assinar históricos', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'assinar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.fechar_mes', 'Fechar mês', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'fechar_mes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.limpeza_semanal.reabrir_mes', 'Reabrir mês', NULL, 'Plano de Limpeza Semanal', 'limpeza_semanal', 'reabrir_mes', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.chamados.acessar', 'Acessar módulo', NULL, 'Chamados de Manutenção', 'chamados', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.chamados.criar_registro', 'Criar registro', NULL, 'Chamados de Manutenção', 'chamados', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.chamados.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Chamados de Manutenção', 'chamados', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.chamados.editar_historico', 'Editar registros históricos', NULL, 'Chamados de Manutenção', 'chamados', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.chamados.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Chamados de Manutenção', 'chamados', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.documentos.acessar', 'Acessar módulo', NULL, 'Documentos / Anexos', 'documentos', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.documentos.gerenciar_anexos', 'Gerenciar anexos', NULL, 'Documentos / Anexos', 'documentos', 'gerenciar_anexos', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.relatorios.acessar', 'Acessar módulo', NULL, 'Relatórios e Auditoria', 'relatorios', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.relatorios.gerenciar_configuracoes', 'Gerenciar configurações', NULL, 'Relatórios e Auditoria', 'relatorios', 'gerenciar_configuracoes', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.acessar', 'Acessar módulo', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'acessar', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.acessar_historico', 'Acessar histórico', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'acessar_historico', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.criar_registro', 'Criar registro', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'criar_registro', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.editar_registro_do_dia', 'Editar registros do dia', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'editar_registro_do_dia', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.editar_historico', 'Editar registros históricos', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'editar_historico', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('modulo.etiquetas.gerenciar_cadastros', 'Gerenciar cadastros', NULL, 'Etiquetas de Validade / StayLabel', 'etiquetas', 'gerenciar_cadastros', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
CROSS JOIN "permissao" permissao
WHERE perfil."codigo" = 'DEV';

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN "permissao" permissao ON permissao."codigo" IN (
  'dashboard.acessar',
  'usuarios.editar_propria_senha',
  'modulo.hortifruti.acessar',
  'modulo.hortifruti.criar_registro',
  'modulo.hortifruti.editar_registro_do_dia',
  'modulo.amostras.acessar',
  'modulo.amostras.criar_registro',
  'modulo.amostras.editar_registro_do_dia',
  'modulo.temperatura.acessar',
  'modulo.temperatura.criar_registro',
  'modulo.temperatura.editar_registro_do_dia',
  'modulo.oleo.acessar',
  'modulo.oleo.criar_registro',
  'modulo.oleo.editar_registro_do_dia',
  'modulo.rastreabilidade.acessar',
  'modulo.rastreabilidade.criar_registro',
  'modulo.rastreabilidade.editar_registro_do_dia',
  'modulo.limpeza_diaria.acessar',
  'modulo.limpeza_diaria.criar_registro',
  'modulo.limpeza_diaria.editar_registro_do_dia',
  'modulo.limpeza_semanal.acessar',
  'modulo.limpeza_semanal.criar_registro',
  'modulo.limpeza_semanal.editar_registro_do_dia',
  'modulo.chamados.acessar',
  'modulo.chamados.criar_registro'
)
WHERE perfil."codigo" = 'COLABORADOR';

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN "permissao" permissao ON permissao."codigo" IN (
  'dashboard.acessar',
  'usuarios.editar_propria_senha',
  'modulo.hortifruti.acessar',
  'modulo.hortifruti.criar_registro',
  'modulo.hortifruti.editar_registro_do_dia',
  'modulo.amostras.acessar',
  'modulo.amostras.criar_registro',
  'modulo.amostras.editar_registro_do_dia',
  'modulo.temperatura.acessar',
  'modulo.temperatura.criar_registro',
  'modulo.temperatura.editar_registro_do_dia',
  'modulo.oleo.acessar',
  'modulo.oleo.criar_registro',
  'modulo.oleo.editar_registro_do_dia',
  'modulo.rastreabilidade.acessar',
  'modulo.rastreabilidade.criar_registro',
  'modulo.rastreabilidade.editar_registro_do_dia',
  'modulo.limpeza_diaria.acessar',
  'modulo.limpeza_diaria.criar_registro',
  'modulo.limpeza_diaria.editar_registro_do_dia',
  'modulo.limpeza_semanal.acessar',
  'modulo.limpeza_semanal.criar_registro',
  'modulo.limpeza_semanal.editar_registro_do_dia',
  'modulo.chamados.acessar',
  'modulo.chamados.criar_registro',
  'modulo.hortifruti.excluir_registro',
  'modulo.hortifruti.fechar_mes',
  'modulo.amostras.acessar_historico',
  'modulo.amostras.excluir_registro',
  'modulo.amostras.assinar_servico',
  'modulo.amostras.assinar_historico',
  'modulo.amostras.fechar_mes',
  'modulo.temperatura.acessar_historico',
  'modulo.temperatura.excluir_registro',
  'modulo.temperatura.assinar_historico',
  'modulo.temperatura.fechar_mes',
  'modulo.oleo.acessar_historico',
  'modulo.oleo.excluir_registro',
  'modulo.oleo.assinar_historico',
  'modulo.oleo.fechar_mes',
  'modulo.rastreabilidade.acessar_historico',
  'modulo.rastreabilidade.fechar_mes',
  'modulo.limpeza_diaria.acessar_historico',
  'modulo.limpeza_diaria.assinar_todos',
  'modulo.limpeza_diaria.assinar_historico',
  'modulo.limpeza_diaria.fechar_mes',
  'modulo.limpeza_semanal.acessar_historico',
  'modulo.limpeza_semanal.assinar_todos',
  'modulo.limpeza_semanal.assinar_historico',
  'modulo.limpeza_semanal.fechar_mes',
  'modulo.chamados.editar_registro_do_dia',
  'modulo.chamados.editar_historico',
  'modulo.documentos.acessar',
  'modulo.relatorios.acessar'
)
WHERE perfil."codigo" = 'NUTRICIONISTA';

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
JOIN "permissao" permissao ON permissao."codigo" IN (
  'dashboard.acessar',
  'usuarios.editar_propria_senha',
  'modulo.hortifruti.acessar',
  'modulo.hortifruti.criar_registro',
  'modulo.hortifruti.editar_registro_do_dia',
  'modulo.amostras.acessar',
  'modulo.amostras.criar_registro',
  'modulo.amostras.editar_registro_do_dia',
  'modulo.temperatura.acessar',
  'modulo.temperatura.criar_registro',
  'modulo.temperatura.editar_registro_do_dia',
  'modulo.oleo.acessar',
  'modulo.oleo.criar_registro',
  'modulo.oleo.editar_registro_do_dia',
  'modulo.rastreabilidade.acessar',
  'modulo.rastreabilidade.criar_registro',
  'modulo.rastreabilidade.editar_registro_do_dia',
  'modulo.limpeza_diaria.acessar',
  'modulo.limpeza_diaria.criar_registro',
  'modulo.limpeza_diaria.editar_registro_do_dia',
  'modulo.limpeza_semanal.acessar',
  'modulo.limpeza_semanal.criar_registro',
  'modulo.limpeza_semanal.editar_registro_do_dia',
  'modulo.chamados.acessar',
  'modulo.chamados.criar_registro',
  'modulo.hortifruti.excluir_registro',
  'modulo.hortifruti.fechar_mes',
  'modulo.amostras.acessar_historico',
  'modulo.amostras.excluir_registro',
  'modulo.amostras.assinar_servico',
  'modulo.amostras.assinar_historico',
  'modulo.amostras.fechar_mes',
  'modulo.temperatura.acessar_historico',
  'modulo.temperatura.excluir_registro',
  'modulo.temperatura.assinar_historico',
  'modulo.temperatura.fechar_mes',
  'modulo.oleo.acessar_historico',
  'modulo.oleo.excluir_registro',
  'modulo.oleo.assinar_historico',
  'modulo.oleo.fechar_mes',
  'modulo.rastreabilidade.acessar_historico',
  'modulo.rastreabilidade.fechar_mes',
  'modulo.limpeza_diaria.acessar_historico',
  'modulo.limpeza_diaria.assinar_todos',
  'modulo.limpeza_diaria.assinar_historico',
  'modulo.limpeza_diaria.fechar_mes',
  'modulo.limpeza_semanal.acessar_historico',
  'modulo.limpeza_semanal.assinar_todos',
  'modulo.limpeza_semanal.assinar_historico',
  'modulo.limpeza_semanal.fechar_mes',
  'modulo.chamados.editar_registro_do_dia',
  'modulo.chamados.editar_historico',
  'modulo.documentos.acessar',
  'modulo.relatorios.acessar',
  'usuarios.acessar',
  'usuarios.criar',
  'usuarios.editar',
  'usuarios.desativar',
  'usuarios.redefinir_senha',
  'modulo.hortifruti.gerenciar_cadastros',
  'modulo.amostras.gerenciar_cadastros',
  'modulo.temperatura.gerenciar_cadastros',
  'modulo.oleo.gerenciar_cadastros',
  'modulo.rastreabilidade.gerenciar_configuracoes',
  'modulo.limpeza_diaria.gerenciar_cadastros',
  'modulo.limpeza_semanal.gerenciar_cadastros',
  'modulo.chamados.gerenciar_cadastros',
  'modulo.documentos.gerenciar_anexos',
  'modulo.relatorios.gerenciar_configuracoes'
)
WHERE perfil."codigo" = 'GERENTE';

UPDATE "usuario" usuario
SET "perfilAcessoId" = perfil.id
FROM "perfil_acesso" perfil
WHERE perfil."perfilLegado" = usuario."perfil";
