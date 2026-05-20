"use client";

import { DocumentoTipo, ModuloDocumento } from "@prisma/client";
import { useState } from "react";

import { PdfUploadField } from "@/components/forms/pdf-upload-field";
import {
  DOCUMENTO_MODULO_OPTIONS,
  DOCUMENTO_TIPO_OPTIONS
} from "@/lib/documentos-tecnicos";

type DocumentoFormFieldsProps = {
  defaultModulo?: ModuloDocumento;
  defaultTodosModulos?: boolean;
  defaultTipo?: DocumentoTipo;
  defaultNome?: string;
  defaultLegislacaoResumo?: string | null;
  defaultDataEmissao?: string;
  defaultDataValidade?: string;
  defaultObservacoes?: string | null;
  defaultAtivo?: boolean;
  existingFileName?: string | null;
  requirePdf?: boolean;
};

const INPUT_CLASS = "bpma-input";

export function DocumentoFormFields({
  defaultModulo = ModuloDocumento.HIGIENIZACAO_HORTIFRUTI,
  defaultTodosModulos = false,
  defaultTipo = DocumentoTipo.LEGISLACAO,
  defaultNome = "",
  defaultLegislacaoResumo = "",
  defaultDataEmissao = "",
  defaultDataValidade = "",
  defaultObservacoes = "",
  defaultAtivo = true,
  existingFileName = null,
  requirePdf = false
}: DocumentoFormFieldsProps) {
  const [tipo, setTipo] = useState<DocumentoTipo>(defaultTipo);
  const [todosModulos, setTodosModulos] = useState(defaultTodosModulos);

  return (
    <>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Aplicação do documento *
        <select
          name="aplicacaoDocumento"
          required
          value={todosModulos ? "TODOS_MODULOS" : "MODULO_ESPECIFICO"}
          className={INPUT_CLASS}
          onChange={(event) => setTodosModulos(event.target.value === "TODOS_MODULOS")}
        >
          <option value="MODULO_ESPECIFICO">Módulo específico</option>
          <option value="TODOS_MODULOS">Todos os módulos</option>
        </select>
      </label>

      {todosModulos ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Este PDF aparecerá no botão Anexos de todos os módulos operacionais permitidos.
        </p>
      ) : (
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Módulo relacionado *
          <select name="modulo" required defaultValue={defaultModulo} className={INPUT_CLASS}>
            {DOCUMENTO_MODULO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Tipo do documento *
        <select
          name="tipo"
          required
          value={tipo}
          className={INPUT_CLASS}
          onChange={(event) => setTipo(event.target.value as DocumentoTipo)}
        >
          {DOCUMENTO_TIPO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Nome/Título do documento *
        <input
          type="text"
          name="nome"
          required
          maxLength={180}
          defaultValue={defaultNome}
          className={INPUT_CLASS}
        />
      </label>

      <label className="text-sm text-slate-700 dark:text-slate-200">
        Status *
        <select
          name="ativo"
          required
          defaultValue={defaultAtivo ? "true" : "false"}
          className={INPUT_CLASS}
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </label>

      {tipo === DocumentoTipo.LEGISLACAO ? (
        <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
          Texto/resumo da legislação para cabeçalho *
          <textarea
            name="legislacaoResumo"
            rows={3}
            required
            maxLength={500}
            defaultValue={defaultLegislacaoResumo ?? ""}
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Use um texto curto. Ele aparece abaixo do título do módulo vinculado.
          </span>
        </label>
      ) : null}

      {tipo === DocumentoTipo.LAUDO ? (
        <>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data de emissão *
            <input
              type="date"
              name="dataEmissao"
              required
              defaultValue={defaultDataEmissao}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data de validade *
            <input
              type="date"
              name="dataValidade"
              required
              defaultValue={defaultDataValidade}
              className={INPUT_CLASS}
            />
          </label>
        </>
      ) : null}

      <label className="text-sm text-slate-700 md:col-span-2 dark:text-slate-200">
        Observações
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={defaultObservacoes ?? ""}
          className={INPUT_CLASS}
        />
      </label>

      <div className="md:col-span-2">
        <PdfUploadField
          name="arquivoPdf"
          label={existingFileName ? "Substituir PDF" : "Arquivo PDF *"}
          required={requirePdf}
          existingFileName={existingFileName}
          helperText="Envie apenas PDF com até 10 MB."
          inputClassName={INPUT_CLASS}
        />
      </div>
    </>
  );
}
