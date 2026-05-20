import { DocumentoTipo, ModuloDocumento } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";

import { ActionModal } from "@/components/ui/action-modal";
import {
  getDocumentoTipoClass,
  getDocumentoTipoLabel,
  getLaudoValidityClass,
  getLaudoValidityLabel,
  getLaudoValidityStatus
} from "@/lib/documentos-tecnicos";
import { formatAppDate } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type DocumentosModuleHeaderProps = {
  title: string;
  description?: string;
  modulo: ModuloDocumento;
  modulePath: string;
  searchParams: SearchParams;
  actions?: ReactNode;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildPathWithParams(modulePath: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${modulePath}?${query}` : modulePath;
}

function buildHeaderHref(
  modulePath: string,
  searchParams: SearchParams,
  open: boolean
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (!value || key === "documentos") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.set(key, value);
    }
  }

  if (open) {
    params.set("documentos", "1");
  }

  return buildPathWithParams(modulePath, params);
}

function TipoBadge({ tipo }: { tipo: DocumentoTipo }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getDocumentoTipoClass(
        tipo
      )}`}
    >
      {getDocumentoTipoLabel(tipo)}
    </span>
  );
}

function LaudoStatusBadge({ dataValidade }: { dataValidade: Date | null }) {
  if (!dataValidade) {
    return null;
  }

  const status = getLaudoValidityStatus(dataValidade);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getLaudoValidityClass(
        status
      )}`}
    >
      {getLaudoValidityLabel(status)}
    </span>
  );
}

export async function DocumentosModuleHeader({
  title,
  modulo,
  modulePath,
  searchParams,
  actions
}: DocumentosModuleHeaderProps) {
  const modalAberto = firstParam(searchParams.documentos) === "1";
  const anexosHref = buildHeaderHref(modulePath, searchParams, true);
  const fecharHref = buildHeaderHref(modulePath, searchParams, false);

  const [documentos, configuracao] = await Promise.all([
    prisma.documentoTecnicoAnexo.findMany({
      where: {
        ativo: true,
        OR: [{ modulo, todosModulos: false }, { todosModulos: true }]
      },
      select: {
        id: true,
        tipo: true,
        nome: true,
        dataEmissao: true,
        dataValidade: true,
        observacoes: true,
        criadoEm: true,
        todosModulos: true
      },
      orderBy: [{ todosModulos: "asc" }, { tipo: "asc" }, { criadoEm: "desc" }, { id: "desc" }]
    }),
    prisma.moduloConfiguracao.findUnique({
      where: { modulo },
      select: { textoCabecalho: true }
    })
  ]);

  const textoCabecalho = configuracao?.textoCabecalho?.trim() ?? "";
  const documentosDesteModulo = documentos.filter((documento) => !documento.todosModulos);
  const documentosGerais = documentos.filter((documento) => documento.todosModulos);

  return (
    <>
      <section className="bpma-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            {textoCabecalho ? (
              <div className="mt-3 max-w-4xl rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:border-l-amber-400 dark:bg-amber-950/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Orientação
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-amber-900 dark:text-amber-100">
                  {textoCabecalho}
                </p>
              </div>
            ) : null}
          </div>
          <div className="btn-group">
            <Link href={anexosHref} className="btn-secondary">
              Anexos
            </Link>
            {actions}
          </div>
        </div>
      </section>

      {modalAberto ? (
        <ActionModal
          title="Anexos"
          cancelHref={fecharHref}
          maxWidthClassName="max-w-4xl"
          description={`Documentos técnicos ativos vinculados a ${title}.`}
        >
          {documentos.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Nenhum documento ativo vinculado a este módulo.
            </p>
          ) : (
            <div className="space-y-4">
              <DocumentGroup title="Documentos deste módulo" documentos={documentosDesteModulo} />
              <DocumentGroup title="Documentos gerais" documentos={documentosGerais} />
            </div>
          )}
        </ActionModal>
      ) : null}
    </>
  );
}

const DOCUMENTO_TIPO_ORDER = [
  DocumentoTipo.LEGISLACAO,
  DocumentoTipo.LAUDO,
  DocumentoTipo.POP_MANUAL
];

type HeaderDocument = {
  id: number;
  tipo: DocumentoTipo;
  nome: string;
  dataEmissao: Date | null;
  dataValidade: Date | null;
  observacoes: string | null;
};

function DocumentGroup({
  title,
  documentos
}: {
  title: string;
  documentos: HeaderDocument[];
}) {
  if (documentos.length === 0) {
    return null;
  }

  const documentosPorTipo = DOCUMENTO_TIPO_ORDER.map((tipo) => ({
    tipo,
    documentos: documentos.filter((documento) => documento.tipo === tipo)
  })).filter((group) => group.documentos.length > 0);

  return (
    <section className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {documentosPorTipo.map((group) => (
          <div key={group.tipo}>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {getDocumentoTipoLabel(group.tipo)}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {group.documentos.map((documento) => (
                <article
                  key={documento.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex flex-wrap gap-2">
                    <TipoBadge tipo={documento.tipo} />
                    {documento.tipo === DocumentoTipo.LAUDO ? (
                      <LaudoStatusBadge dataValidade={documento.dataValidade} />
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                    {documento.nome}
                  </p>
                  {documento.tipo === DocumentoTipo.LAUDO ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Emissão: {documento.dataEmissao ? formatAppDate(documento.dataEmissao) : "-"}
                      {" • "}
                      Validade: {documento.dataValidade ? formatAppDate(documento.dataValidade) : "-"}
                    </p>
                  ) : null}
                  {documento.observacoes ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {documento.observacoes}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <a
                      href={`/api/documentos-tecnicos/${documento.id}/download`}
                      className="btn-action"
                    >
                      Baixar PDF
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
