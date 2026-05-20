import { DocumentoTipo, Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import {
  DOCUMENTO_MODULO_OPTIONS,
  DOCUMENTO_TIPO_OPTIONS,
  formatFileSize,
  getDocumentoAplicacaoLabel,
  getDocumentoModuloLabel,
  getDocumentoTipoClass,
  getDocumentoTipoLabel,
  getLaudoValidityClass,
  getLaudoValidityLabel,
  getLaudoValidityStatus,
  parseDocumentoTipo,
  parseModuloDocumento,
  type LaudoValidityStatus
} from "@/lib/documentos-tecnicos";
import {
  formatAppDate,
  formatAppDateInput,
  formatAppDateTime,
  getAppDate
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import {
  canAccessTechnicalDocuments,
  canManageTechnicalDocuments
} from "@/lib/rbac";

import { ThemeToggleButton } from "../higienizacao-hortifruti/theme-toggle-button";
import {
  createDocumentoAction,
  deleteDocumentoAction,
  toggleDocumentoStatusAction,
  updateDocumentoAction
} from "./actions";
import { DocumentoFormFields } from "./documento-form-fields";

const MODULE_PATH = "/documentos-tecnicos";
const CARD_CLASS = "bpma-card";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildPathWithParams(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${MODULE_PATH}?${query}` : MODULE_PATH;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseAtivoFilter(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseValidadeFilter(value: string): LaudoValidityStatus | null {
  if (value === "VALIDO") return "VALIDO";
  if (value === "PROXIMO_VENCIMENTO") return "PROXIMO_VENCIMENTO";
  if (value === "VENCIDO") return "VENCIDO";
  return null;
}

function parseAplicacaoFilter(value: string): "MODULO_ESPECIFICO" | "TODOS_MODULOS" | null {
  if (value === "MODULO_ESPECIFICO") return "MODULO_ESPECIFICO";
  if (value === "TODOS_MODULOS") return "TODOS_MODULOS";
  return null;
}

function StatusAtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        ativo
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function TipoDocumentoBadge({ tipo }: { tipo: DocumentoTipo }) {
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

function LaudoBadge({ dataValidade }: { dataValidade: Date | null }) {
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

export default async function DocumentosTecnicosPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !canAccessTechnicalDocuments(user.perfil)) {
    redirect("/acesso-negado");
  }

  const canManage = canManageTechnicalDocuments(user.perfil);
  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const modalError = feedback && feedbackType === "error" ? feedback : "";

  const filtroModulo = parseModuloDocumento(firstParam(params.filtroModulo).trim());
  const filtroAplicacao = parseAplicacaoFilter(firstParam(params.filtroAplicacao).trim());
  const filtroTipo = parseDocumentoTipo(firstParam(params.filtroTipo).trim());
  const filtroAtivo = parseAtivoFilter(firstParam(params.filtroAtivo).trim());
  const filtroValidade = parseValidadeFilter(firstParam(params.filtroValidade).trim());
  const filtroBusca = firstParam(params.filtroBusca).trim();

  const where: Prisma.DocumentoTecnicoAnexoWhereInput = {};
  if (filtroModulo && filtroAplicacao !== "TODOS_MODULOS") {
    where.modulo = filtroModulo;
  }
  if (filtroAplicacao === "MODULO_ESPECIFICO") {
    where.todosModulos = false;
  } else if (filtroAplicacao === "TODOS_MODULOS") {
    where.todosModulos = true;
  }
  if (filtroTipo) {
    where.tipo = filtroTipo;
  }
  if (canManage && filtroAtivo !== null) {
    where.ativo = filtroAtivo;
  } else if (!canManage) {
    where.ativo = true;
  }
  if (filtroBusca) {
    where.nome = { contains: filtroBusca, mode: "insensitive" };
  }
  if (filtroValidade) {
    const today = getAppDate();
    const soon = addDays(today, 30);
    where.tipo = DocumentoTipo.LAUDO;

    if (filtroValidade === "VENCIDO") {
      where.dataValidade = { lt: today };
    } else if (filtroValidade === "PROXIMO_VENCIMENTO") {
      where.dataValidade = { gte: today, lte: soon };
    } else {
      where.dataValidade = { gt: soon };
    }
  }

  const documentos = await prisma.documentoTecnicoAnexo.findMany({
    where,
    include: {
      criadoPor: {
        select: {
          nomeCompleto: true
        }
      }
    },
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }]
  });

  const editId = parsePositiveInt(firstParam(params.editId).trim());
  const deleteId = parsePositiveInt(firstParam(params.deleteId).trim());
  const novoDocumentoSelecionado = firstParam(params.new) === "1";
  const documentoEmEdicao =
    canManage && editId
      ? await prisma.documentoTecnicoAnexo.findUnique({ where: { id: editId } })
      : null;
  const documentoParaExcluir =
    canManage && deleteId
      ? await prisma.documentoTecnicoAnexo.findUnique({
          where: { id: deleteId },
          select: {
            id: true,
            nome: true,
            modulo: true,
            todosModulos: true,
            tipo: true,
            ativo: true
          }
        })
      : null;

  const paramsRetorno = new URLSearchParams();
  if (filtroModulo) paramsRetorno.set("filtroModulo", filtroModulo);
  if (filtroAplicacao) paramsRetorno.set("filtroAplicacao", filtroAplicacao);
  if (filtroTipo) paramsRetorno.set("filtroTipo", filtroTipo);
  if (canManage && filtroAtivo !== null) paramsRetorno.set("filtroAtivo", String(filtroAtivo));
  if (filtroValidade) paramsRetorno.set("filtroValidade", filtroValidade);
  if (filtroBusca) paramsRetorno.set("filtroBusca", filtroBusca);
  const returnTo = buildPathWithParams(paramsRetorno);
  const hrefNovoDocumento = (() => {
    const query = new URLSearchParams(paramsRetorno);
    query.set("new", "1");
    return buildPathWithParams(query);
  })();
  const hrefCancelarFormulario = returnTo;
  const mostrarFormulario = canManage && (novoDocumentoSelecionado || Boolean(documentoEmEdicao));
  const formReturnTo = (() => {
    const query = new URLSearchParams(paramsRetorno);
    if (documentoEmEdicao) {
      query.set("editId", String(documentoEmEdicao.id));
    } else {
      query.set("new", "1");
    }
    return buildPathWithParams(query);
  })();
  const deleteReturnTo = (() => {
    const query = new URLSearchParams(paramsRetorno);
    if (documentoParaExcluir) {
      query.set("deleteId", String(documentoParaExcluir.id));
    }
    return buildPathWithParams(query);
  })();

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Anexos e Documentos
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Gestão de PDFs técnicos, legais e operacionais vinculados aos módulos do BPMA.
            </p>
          </div>
          <div className="btn-group">
            <ThemeToggleButton />
          </div>
        </div>
      </section>

      {feedback ? (
        <section
          className={`rounded-xl border p-4 text-sm ${
            feedbackType === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {feedback}
        </section>
      ) : null}

      {canManage ? (
        <div className={mostrarFormulario ? "bpma-modal-backdrop" : ""}>
          <section className={mostrarFormulario ? "bpma-modal-panel max-w-4xl" : CARD_CLASS}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {documentoEmEdicao ? "Editar Documento" : "Cadastro de Documento"}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Cadastre legislação, laudos ou POP/manuais em PDF.
                </p>
              </div>
              {mostrarFormulario ? (
                <Link href={hrefCancelarFormulario} className="btn-secondary">
                  Cancelar
                </Link>
              ) : null}
            </div>

            {!mostrarFormulario ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Clique em <strong>Novo Documento</strong> para abrir o cadastro.
                </p>
                <Link href={hrefNovoDocumento} className="btn-primary">
                  Novo Documento
                </Link>
              </div>
            ) : (
              <>
                {modalError ? (
                  <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    {modalError}
                  </p>
                ) : null}
                <form
                  action={documentoEmEdicao ? updateDocumentoAction : createDocumentoAction}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <input type="hidden" name="returnTo" value={formReturnTo} />
                  {documentoEmEdicao ? (
                    <input type="hidden" name="id" value={documentoEmEdicao.id} />
                  ) : null}
                  <DocumentoFormFields
                    defaultModulo={documentoEmEdicao?.modulo ?? undefined}
                    defaultTodosModulos={documentoEmEdicao?.todosModulos ?? false}
                    defaultTipo={documentoEmEdicao?.tipo}
                    defaultNome={documentoEmEdicao?.nome ?? ""}
                    defaultLegislacaoResumo={documentoEmEdicao?.legislacaoResumo ?? ""}
                    defaultDataEmissao={
                      documentoEmEdicao?.dataEmissao
                        ? formatAppDateInput(documentoEmEdicao.dataEmissao)
                        : ""
                    }
                    defaultDataValidade={
                      documentoEmEdicao?.dataValidade
                        ? formatAppDateInput(documentoEmEdicao.dataValidade)
                        : ""
                    }
                    defaultObservacoes={documentoEmEdicao?.observacoes ?? ""}
                    defaultAtivo={documentoEmEdicao?.ativo ?? true}
                    existingFileName={documentoEmEdicao?.arquivoNome ?? null}
                    requirePdf={!documentoEmEdicao}
                  />
                  <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
                    <Link href={hrefCancelarFormulario} className="btn-secondary text-center">
                      Cancelar
                    </Link>
                    <button type="submit" className="btn-primary">
                      {documentoEmEdicao ? "Salvar Alterações" : "Cadastrar Documento"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Documentos Cadastrados
        </h2>

        <form method="get" className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-6 dark:bg-slate-800">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Aplicação
            <select
              name="filtroAplicacao"
              defaultValue={filtroAplicacao ?? ""}
              className="bpma-input"
            >
              <option value="">Todas</option>
              <option value="MODULO_ESPECIFICO">Módulo específico</option>
              <option value="TODOS_MODULOS">Todos os módulos</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Módulo
            <select name="filtroModulo" defaultValue={filtroModulo ?? ""} className="bpma-input">
              <option value="">Todos</option>
              {DOCUMENTO_MODULO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Tipo
            <select name="filtroTipo" defaultValue={filtroTipo ?? ""} className="bpma-input">
              <option value="">Todos</option>
              {DOCUMENTO_TIPO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {canManage ? (
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select
                name="filtroAtivo"
                defaultValue={filtroAtivo === null ? "" : String(filtroAtivo)}
                className="bpma-input"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </label>
          ) : null}
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade do laudo
            <select
              name="filtroValidade"
              defaultValue={filtroValidade ?? ""}
              className="bpma-input"
            >
              <option value="">Todos</option>
              <option value="VALIDO">Válido</option>
              <option value="PROXIMO_VENCIMENTO">Próximo do vencimento</option>
              <option value="VENCIDO">Vencido</option>
            </select>
          </label>
          <label className={`text-sm text-slate-700 dark:text-slate-200 ${canManage ? "" : "md:col-span-2"}`}>
            Busca por nome
            <input
              type="text"
              name="filtroBusca"
              defaultValue={filtroBusca}
              className="bpma-input"
            />
          </label>
          <div className="btn-group md:col-span-6">
            <button type="submit" className="btn-primary">
              Aplicar Filtros
            </button>
            <Link href={MODULE_PATH} className="btn-secondary">
              Limpar
            </Link>
          </div>
        </form>

        <div className="mt-4 space-y-3 md:hidden">
          {documentos.length === 0 ? (
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nenhum documento encontrado.
            </div>
          ) : (
            documentos.map((documento) => {
              const hrefEditar = (() => {
                const query = new URLSearchParams(paramsRetorno);
                query.set("editId", String(documento.id));
                return buildPathWithParams(query);
              })();
              const hrefExcluir = (() => {
                const query = new URLSearchParams(paramsRetorno);
                query.set("deleteId", String(documento.id));
                return buildPathWithParams(query);
              })();

              return (
                <article key={documento.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    <TipoDocumentoBadge tipo={documento.tipo} />
                    <StatusAtivoBadge ativo={documento.ativo} />
                    {documento.tipo === DocumentoTipo.LAUDO ? (
                      <LaudoBadge dataValidade={documento.dataValidade} />
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {documento.nome}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {getDocumentoAplicacaoLabel({
                      todosModulos: documento.todosModulos,
                      modulo: documento.modulo
                    })}
                  </p>
                  {documento.dataEmissao || documento.dataValidade ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Emissão: {documento.dataEmissao ? formatAppDate(documento.dataEmissao) : "-"} •
                      Validade: {documento.dataValidade ? formatAppDate(documento.dataValidade) : "-"}
                    </p>
                  ) : null}
                  {documento.observacoes ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      {documento.observacoes}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Upload: {formatAppDateTime(documento.criadoEm)} por {documento.criadoPor.nomeCompleto}
                  </p>
                  <div className="btn-group mt-3">
                    <a href={`/api/documentos-tecnicos/${documento.id}/download`} className="btn-action">
                      Baixar
                    </a>
                    {canManage ? (
                      <>
                        <Link href={hrefEditar} className="btn-secondary">
                          Editar
                        </Link>
                        <form action={toggleDocumentoStatusAction}>
                          <input type="hidden" name="id" value={documento.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="ativo" value={documento.ativo ? "false" : "true"} />
                          <button type="submit" className="btn-secondary">
                            {documento.ativo ? "Inativar" : "Ativar"}
                          </button>
                        </form>
                        <Link href={hrefExcluir} className="btn-danger">
                          Excluir
                        </Link>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Aplicação</th>
                <th className="px-3 py-2">Emissão</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Cadastrado por</th>
                <th className="px-3 py-2">Upload</th>
                <th className="px-3 py-2">PDF</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : (
                documentos.map((documento) => {
                  const hrefEditar = (() => {
                    const query = new URLSearchParams(paramsRetorno);
                    query.set("editId", String(documento.id));
                    return buildPathWithParams(query);
                  })();
                  const hrefExcluir = (() => {
                    const query = new URLSearchParams(paramsRetorno);
                    query.set("deleteId", String(documento.id));
                    return buildPathWithParams(query);
                  })();

                  return (
                    <tr key={documento.id}>
                      <td className="max-w-72 whitespace-normal break-words px-3 py-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {documento.nome}
                        </p>
                        {documento.observacoes ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {documento.observacoes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <TipoDocumentoBadge tipo={documento.tipo} />
                      </td>
                      <td className="px-3 py-2">
                        {documento.modulo ? getDocumentoModuloLabel(documento.modulo) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {documento.todosModulos ? "Todos os módulos" : "Módulo específico"}
                      </td>
                      <td className="px-3 py-2">
                        {documento.dataEmissao ? formatAppDate(documento.dataEmissao) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {documento.dataValidade ? formatAppDate(documento.dataValidade) : "-"}
                        {documento.tipo === DocumentoTipo.LAUDO ? (
                          <span className="mt-1 block">
                            <LaudoBadge dataValidade={documento.dataValidade} />
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <StatusAtivoBadge ativo={documento.ativo} />
                      </td>
                      <td className="px-3 py-2">{documento.criadoPor.nomeCompleto}</td>
                      <td className="px-3 py-2">{formatAppDateTime(documento.criadoEm)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatFileSize(documento.arquivoTamanho)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="btn-group">
                          <a href={`/api/documentos-tecnicos/${documento.id}/download`} className="btn-action">
                            Baixar
                          </a>
                          {canManage ? (
                            <>
                              <Link href={hrefEditar} className="btn-secondary">
                                Editar
                              </Link>
                              <form action={toggleDocumentoStatusAction}>
                                <input type="hidden" name="id" value={documento.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input
                                  type="hidden"
                                  name="ativo"
                                  value={documento.ativo ? "false" : "true"}
                                />
                                <button type="submit" className="btn-secondary">
                                  {documento.ativo ? "Inativar" : "Ativar"}
                                </button>
                              </form>
                              <Link href={hrefExcluir} className="btn-danger">
                                Excluir
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {documentoParaExcluir ? (
        <ActionModal
          title="Excluir Documento"
          cancelHref={hrefCancelarFormulario}
          description={
            <p>
              Documento: <strong>{documentoParaExcluir.nome}</strong> em{" "}
              {getDocumentoAplicacaoLabel({
                todosModulos: documentoParaExcluir.todosModulos,
                modulo: documentoParaExcluir.modulo
              })}.
            </p>
          }
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          <form action={deleteDocumentoAction}>
            <input type="hidden" name="id" value={documentoParaExcluir.id} />
            <input type="hidden" name="returnTo" value={deleteReturnTo} />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              A exclusão remove o PDF do banco. Para preservar histórico, use Inativar.
            </p>
            <ModalActions>
              <Link href={hrefCancelarFormulario} className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-danger">
                Excluir Documento
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
