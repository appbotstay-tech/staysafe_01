CREATE TABLE IF NOT EXISTS "assinatura_diaria_modulo" (
  "id" SERIAL NOT NULL,
  "moduloCodigo" TEXT NOT NULL,
  "dataReferencia" DATE NOT NULL,
  "usuarioId" INTEGER,
  "usuarioNomeSnapshot" TEXT NOT NULL,
  "usuarioPerfilSnapshot" "PerfilUsuario" NOT NULL,
  "responsavelTecnico" BOOLEAN NOT NULL DEFAULT true,
  "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observacao" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assinatura_diaria_modulo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fechamento_mensal_modulo" (
  "id" SERIAL NOT NULL,
  "moduloCodigo" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "usuarioId" INTEGER,
  "usuarioNomeSnapshot" TEXT NOT NULL,
  "usuarioPerfilSnapshot" "PerfilUsuario" NOT NULL,
  "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "indicadoresSnapshot" JSONB,
  "observacao" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fechamento_mensal_modulo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assinatura_diaria_modulo_moduloCodigo_dataReferencia_key"
  ON "assinatura_diaria_modulo"("moduloCodigo", "dataReferencia");

CREATE INDEX IF NOT EXISTS "assinatura_diaria_modulo_moduloCodigo_assinadoEm_idx"
  ON "assinatura_diaria_modulo"("moduloCodigo", "assinadoEm");

CREATE INDEX IF NOT EXISTS "assinatura_diaria_modulo_usuarioId_idx"
  ON "assinatura_diaria_modulo"("usuarioId");

CREATE UNIQUE INDEX IF NOT EXISTS "fechamento_mensal_modulo_moduloCodigo_ano_mes_key"
  ON "fechamento_mensal_modulo"("moduloCodigo", "ano", "mes");

CREATE INDEX IF NOT EXISTS "fechamento_mensal_modulo_moduloCodigo_ano_mes_idx"
  ON "fechamento_mensal_modulo"("moduloCodigo", "ano", "mes");

CREATE INDEX IF NOT EXISTS "fechamento_mensal_modulo_usuarioId_idx"
  ON "fechamento_mensal_modulo"("usuarioId");

WITH novas_permissoes("codigo", "nome", "grupo", "modulo", "acao", "sensivel") AS (
  VALUES
    ('usuarios.responsavel_tecnico', 'Responsável técnico / pode assinar como supervisor', 'Perfis e Permissões', 'usuarios', 'responsavel_tecnico', true),
    ('modulo.hortifruti.assinar_dia', 'Assinar dias como supervisor', 'Higienização de Hortifruti', 'hortifruti', 'assinar_dia', false),
    ('modulo.hortifruti.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Higienização de Hortifruti', 'hortifruti', 'assinar_fechamento_mensal', false),
    ('modulo.amostras.assinar_dia', 'Assinar dias como supervisor', 'Amostras / Controle de Buffet', 'amostras', 'assinar_dia', false),
    ('modulo.amostras.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Amostras / Controle de Buffet', 'amostras', 'assinar_fechamento_mensal', false),
    ('modulo.temperatura.assinar_dia', 'Assinar dias como supervisor', 'Temperatura de Equipamentos', 'temperatura', 'assinar_dia', false),
    ('modulo.temperatura.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Temperatura de Equipamentos', 'temperatura', 'assinar_fechamento_mensal', false),
    ('modulo.oleo.assinar_dia', 'Assinar dias como supervisor', 'Qualidade do Óleo', 'oleo', 'assinar_dia', false),
    ('modulo.oleo.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Qualidade do Óleo', 'oleo', 'assinar_fechamento_mensal', false),
    ('modulo.rastreabilidade.assinar_dia', 'Assinar dias como supervisor', 'Rastreabilidade', 'rastreabilidade', 'assinar_dia', false),
    ('modulo.rastreabilidade.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Rastreabilidade', 'rastreabilidade', 'assinar_fechamento_mensal', false),
    ('modulo.limpeza_diaria.assinar_dia', 'Assinar dias como supervisor', 'Plano de Limpeza Diário', 'limpeza_diaria', 'assinar_dia', false),
    ('modulo.limpeza_diaria.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Plano de Limpeza Diário', 'limpeza_diaria', 'assinar_fechamento_mensal', false),
    ('modulo.limpeza_semanal.assinar_dia', 'Assinar dias como supervisor', 'Plano de Limpeza Semanal', 'limpeza_semanal', 'assinar_dia', false),
    ('modulo.limpeza_semanal.assinar_fechamento_mensal', 'Assinar fechamento mensal', 'Plano de Limpeza Semanal', 'limpeza_semanal', 'assinar_fechamento_mensal', false)
)
INSERT INTO "permissao" ("codigo", "nome", "descricao", "grupo", "modulo", "acao", "sensivel", "criadoEm", "atualizadoEm")
SELECT "codigo", "nome", "nome", "grupo", "modulo", "acao", "sensivel", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM novas_permissoes
ON CONFLICT ("codigo") DO UPDATE SET
  "nome" = EXCLUDED."nome",
  "descricao" = EXCLUDED."descricao",
  "grupo" = EXCLUDED."grupo",
  "modulo" = EXCLUDED."modulo",
  "acao" = EXCLUDED."acao",
  "sensivel" = EXCLUDED."sensivel",
  "atualizadoEm" = CURRENT_TIMESTAMP;

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
CROSS JOIN "permissao" permissao
WHERE perfil."codigo" = 'DEV'
  AND permissao."codigo" IN (
    'usuarios.responsavel_tecnico',
    'modulo.hortifruti.assinar_dia',
    'modulo.hortifruti.assinar_fechamento_mensal',
    'modulo.amostras.assinar_dia',
    'modulo.amostras.assinar_fechamento_mensal',
    'modulo.temperatura.assinar_dia',
    'modulo.temperatura.assinar_fechamento_mensal',
    'modulo.oleo.assinar_dia',
    'modulo.oleo.assinar_fechamento_mensal',
    'modulo.rastreabilidade.assinar_dia',
    'modulo.rastreabilidade.assinar_fechamento_mensal',
    'modulo.limpeza_diaria.assinar_dia',
    'modulo.limpeza_diaria.assinar_fechamento_mensal',
    'modulo.limpeza_semanal.assinar_dia',
    'modulo.limpeza_semanal.assinar_fechamento_mensal'
  )
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;

INSERT INTO "perfil_permissao" ("perfilId", "permissaoId", "permitido", "criadoEm", "atualizadoEm")
SELECT perfil.id, permissao.id, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "perfil_acesso" perfil
CROSS JOIN "permissao" permissao
WHERE perfil."codigo" IN ('GERENTE', 'NUTRICIONISTA')
  AND permissao."codigo" IN (
    'usuarios.responsavel_tecnico',
    'modulo.hortifruti.assinar_dia',
    'modulo.hortifruti.assinar_fechamento_mensal',
    'modulo.amostras.assinar_dia',
    'modulo.amostras.assinar_fechamento_mensal',
    'modulo.temperatura.assinar_dia',
    'modulo.temperatura.assinar_fechamento_mensal',
    'modulo.oleo.assinar_dia',
    'modulo.oleo.assinar_fechamento_mensal',
    'modulo.rastreabilidade.assinar_dia',
    'modulo.rastreabilidade.assinar_fechamento_mensal',
    'modulo.limpeza_diaria.assinar_dia',
    'modulo.limpeza_diaria.assinar_fechamento_mensal',
    'modulo.limpeza_semanal.assinar_dia',
    'modulo.limpeza_semanal.assinar_fechamento_mensal'
  )
ON CONFLICT ("perfilId", "permissaoId") DO NOTHING;
