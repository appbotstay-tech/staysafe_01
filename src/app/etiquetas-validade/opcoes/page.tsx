import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { requireAuthenticatedUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAccessValidityLabels } from "@/lib/rbac";

import {
  createGroupAction,
  createManualBaseAction,
  createMethodAction,
  createProductAction,
  createValidityRuleAction,
  deleteGroupAction,
  deleteMethodAction,
  deleteProductAction,
  deleteValidityRuleAction,
  toggleGroupStatusAction,
  toggleMethodStatusAction,
  toggleProductStatusAction,
  toggleValidityRuleStatusAction,
  updateGroupAction,
  updateMethodAction,
  updatePrintConfigAction,
  updateProductAction,
  updateValidityRuleAction
} from "../actions";
import { ConfirmSubmitButton } from "../confirm-submit-button";
import {
  CARD_CLASS,
  DEFAULT_PRINT_CONFIG,
  INPUT_CLASS,
  MODULE_PATH,
  OPTIONS_PATH,
  UNIT_OPTIONS,
  type PrintConfig
} from "../constants";

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

function buildOptionsPath(params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString ? `${OPTIONS_PATH}?${queryString}` : OPTIONS_PATH;
}

function statusBadgeClass(active: boolean): string {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function validityLabel(regra: {
  validadeDias: number | null;
  validadeHoras: number | null;
  exigeValidadeManual: boolean;
}): string {
  if (regra.exigeValidadeManual) return "Manual";
  const parts = [];
  if (regra.validadeDias) parts.push(`${regra.validadeDias} dia(s)`);
  if (regra.validadeHoras) parts.push(`${regra.validadeHoras} hora(s)`);
  return parts.join(" + ") || "Manual";
}

function GroupFields({
  grupos,
  defaults
}: {
  grupos: Array<{ id: number; nome: string }>;
  defaults?: {
    nome: string;
    grupoPaiId: number | null;
    icone: string | null;
    ordem: number;
    ativo: boolean;
  };
}) {
  return (
    <>
      <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
        Nome *
        <input name="nome" required defaultValue={defaults?.nome ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Grupo pai
        <select name="grupoPaiId" defaultValue={defaults?.grupoPaiId ?? ""} className={INPUT_CLASS}>
          <option value="">Grupo principal</option>
          {grupos.map((grupo) => (
            <option key={grupo.id} value={grupo.id}>
              {grupo.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Ícone
        <input name="icone" defaultValue={defaults?.icone ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Ordem
        <input
          name="ordem"
          type="number"
          min={0}
          defaultValue={defaults?.ordem ?? 0}
          className={INPUT_CLASS}
        />
      </label>
      <label className="text-sm text-slate-700 dark:text-slate-200">
        Status
        <select name="ativo" defaultValue={defaults?.ativo === false ? "false" : "true"} className={INPUT_CLASS}>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </label>
    </>
  );
}

export default async function EtiquetasValidadeOpcoesPage({ searchParams }: PageProps) {
  const user = await requireAuthenticatedUser();
  if (!canAccessValidityLabels(user.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editGrupoId = parsePositiveInt(firstParam(params.editGrupoId).trim());
  const editProdutoId = parsePositiveInt(firstParam(params.editProdutoId).trim());
  const editMetodoId = parsePositiveInt(firstParam(params.editMetodoId).trim());
  const editRegraId = parsePositiveInt(firstParam(params.editRegraId).trim());

  const [grupos, produtos, metodos, regras, configuracaoDb] = await Promise.all([
    prisma.etiquetaValidadeGrupo.findMany({
      include: { grupoPai: true },
      orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeProduto.findMany({
      include: { grupos: { include: { grupo: true } } },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeMetodo.findMany({
      orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeRegra.findMany({
      include: { produto: true, grupo: true, metodo: true },
      orderBy: [{ ativo: "desc" }, { prioridade: "desc" }, { id: "desc" }]
    }),
    prisma.etiquetaValidadeConfiguracaoImpressao.findFirst({ orderBy: { id: "asc" } })
  ]);

  const configuracao: PrintConfig = configuracaoDb ?? DEFAULT_PRINT_CONFIG;
  const activeGroups = grupos.filter((grupo) => grupo.ativo);
  const activeProducts = produtos.filter((produto) => produto.ativo);
  const activeMethods = metodos.filter((metodo) => metodo.ativo);
  const grupoEdicao = editGrupoId ? grupos.find((grupo) => grupo.id === editGrupoId) ?? null : null;
  const produtoEdicao = editProdutoId
    ? produtos.find((produto) => produto.id === editProdutoId) ?? null
    : null;
  const metodoEdicao = editMetodoId
    ? metodos.find((metodo) => metodo.id === editMetodoId) ?? null
    : null;
  const regraEdicao = editRegraId ? regras.find((regra) => regra.id === editRegraId) ?? null : null;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar - Etiquetas de Validade
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Cadastros internos de grupos, produtos, métodos, regras de validade e configuração da etiqueta.
            </p>
          </div>
          <div className="btn-group">
            <Link href={MODULE_PATH} className="btn-secondary">
              Voltar ao Módulo
            </Link>
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

      <section className={CARD_CLASS}>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Base sugerida
        </h2>
        <form action={createManualBaseAction}>
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <ConfirmSubmitButton
            message="Criar/atualizar grupos, produtos, métodos e regras sugeridos do Manual de Boas Práticas?"
            className="btn-secondary"
          >
            Criar base sugerida do Manual
          </ConfirmSubmitButton>
        </form>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Grupos e Subgrupos
        </h2>
        <form action={createGroupAction} className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <GroupFields grupos={activeGroups.map((grupo) => ({ id: grupo.id, nome: grupo.nome }))} />
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">Cadastrar grupo</button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Grupo</th>
                <th className="px-3 py-2">Pai</th>
                <th className="px-3 py-2">Ordem</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {grupos.map((grupo) => (
                <tr key={grupo.id}>
                  <td className="px-3 py-2 font-medium">{grupo.nome}</td>
                  <td className="px-3 py-2">{grupo.grupoPai?.nome ?? "-"}</td>
                  <td className="px-3 py-2">{grupo.ordem}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(grupo.ativo)}`}>
                      {grupo.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="btn-group">
                      <Link href={buildOptionsPath(new URLSearchParams([["editGrupoId", String(grupo.id)]]))} scroll={false} className="btn-secondary">
                        Editar
                      </Link>
                      <form action={toggleGroupStatusAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={grupo.id} />
                        <button className="btn-secondary" type="submit">{grupo.ativo ? "Inativar" : "Ativar"}</button>
                      </form>
                      <form action={deleteGroupAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={grupo.id} />
                        <ConfirmSubmitButton message="Deseja excluir este grupo?" className="btn-danger">
                          Excluir
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Produtos
        </h2>
        <form action={createProductAction} className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Nome *
            <input name="nome" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Unidade padrão *
            <select name="unidadePadrao" required className={INPUT_CLASS}>
              <option value="">Selecione</option>
              {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="ativo" defaultValue="true" className={INPUT_CLASS}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Grupos/Subgrupos *
            <select name="grupoIds" multiple required className={INPUT_CLASS}>
              {activeGroups.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Observação
            <textarea name="observacao" rows={3} className={INPUT_CLASS} />
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">Cadastrar produto</button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Grupos</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="px-3 py-2 font-medium">{produto.nome}</td>
                  <td className="px-3 py-2">{produto.grupos.map((item) => item.grupo.nome).join(", ") || "-"}</td>
                  <td className="px-3 py-2">{produto.unidadePadrao}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(produto.ativo)}`}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="btn-group">
                      <Link href={buildOptionsPath(new URLSearchParams([["editProdutoId", String(produto.id)]]))} scroll={false} className="btn-secondary">Editar</Link>
                      <form action={toggleProductStatusAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={produto.id} />
                        <button type="submit" className="btn-secondary">{produto.ativo ? "Inativar" : "Ativar"}</button>
                      </form>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={produto.id} />
                        <ConfirmSubmitButton message="Deseja excluir este produto? Se houver histórico, ele será inativado." className="btn-danger">Excluir</ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Métodos / Conservações
        </h2>
        <form action={createMethodAction} className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-5">
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Nome *
            <input name="nome" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Tipo
            <input name="tipo" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Ordem
            <input type="number" min={0} name="ordem" defaultValue={0} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="ativo" defaultValue="true" className={INPUT_CLASS}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <div className="md:col-span-5">
            <button type="submit" className="btn-primary">Cadastrar método</button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metodos.map((metodo) => (
            <div key={metodo.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="font-semibold">{metodo.nome}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{metodo.tipo ?? "-"} • Ordem {metodo.ordem}</p>
              <div className="mt-3 btn-group">
                <Link href={buildOptionsPath(new URLSearchParams([["editMetodoId", String(metodo.id)]]))} scroll={false} className="btn-secondary">Editar</Link>
                <form action={toggleMethodStatusAction}>
                  <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                  <input type="hidden" name="id" value={metodo.id} />
                  <button type="submit" className="btn-secondary">{metodo.ativo ? "Inativar" : "Ativar"}</button>
                </form>
                <form action={deleteMethodAction}>
                  <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                  <input type="hidden" name="id" value={metodo.id} />
                  <ConfirmSubmitButton message="Deseja excluir este método?" className="btn-danger">Excluir</ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Regras de Validade
        </h2>
        <form action={createValidityRuleAction} className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Produto específico
            <select name="produtoId" className={INPUT_CLASS}>
              <option value="">Regra por grupo/geral</option>
              {activeProducts.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Grupo/Subgrupo
            <select name="grupoId" className={INPUT_CLASS}>
              <option value="">Regra geral do método</option>
              {activeGroups.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Método *
            <select name="metodoId" required className={INPUT_CLASS}>
              <option value="">Selecione</option>
              {activeMethods.map((metodo) => <option key={metodo.id} value={metodo.id}>{metodo.nome}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Prioridade
            <input type="number" min={0} name="prioridade" defaultValue={0} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade em dias
            <input type="number" min={1} name="validadeDias" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Validade em horas
            <input type="number" min={1} name="validadeHoras" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Temperatura/referência
            <input name="temperaturaReferencia" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="ativo" defaultValue="true" className={INPUT_CLASS}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" name="exigeValidadeManual" />
            Exige validade manual
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-3">
            Observação
            <input name="observacao" className={INPUT_CLASS} />
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">Cadastrar regra</button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Escopo</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Temp.</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {regras.map((regra) => (
                <tr key={regra.id}>
                  <td className="px-3 py-2">{regra.produto?.nome ?? regra.grupo?.nome ?? "Geral do método"}</td>
                  <td className="px-3 py-2">{regra.metodo.nome}</td>
                  <td className="px-3 py-2">{validityLabel(regra)}</td>
                  <td className="px-3 py-2">{regra.temperaturaReferencia ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(regra.ativo)}`}>
                      {regra.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="btn-group">
                      <Link href={buildOptionsPath(new URLSearchParams([["editRegraId", String(regra.id)]]))} scroll={false} className="btn-secondary">Editar</Link>
                      <form action={toggleValidityRuleStatusAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={regra.id} />
                        <button type="submit" className="btn-secondary">{regra.ativo ? "Inativar" : "Ativar"}</button>
                      </form>
                      <form action={deleteValidityRuleAction}>
                        <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
                        <input type="hidden" name="id" value={regra.id} />
                        <ConfirmSubmitButton message="Deseja excluir esta regra?" className="btn-danger">Excluir</ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Configuração da Etiqueta
        </h2>
        <form action={updatePrintConfigAction} className="grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
          <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Largura (mm)
            <input name="larguraMm" type="number" min={20} defaultValue={configuracao.larguraMm} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Altura (mm)
            <input name="alturaMm" type="number" min={20} defaultValue={configuracao.alturaMm} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Margem (mm)
            <input name="margemMm" type="number" min={1} defaultValue={configuracao.margemMm} className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Fonte (pt)
            <input name="tamanhoFonte" type="number" min={7} defaultValue={configuracao.tamanhoFonte} className={INPUT_CLASS} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" name="mostrarQrCode" defaultChecked={configuracao.mostrarQrCode} /> Mostrar QR Code</label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" name="mostrarSif" defaultChecked={configuracao.mostrarSif} /> Mostrar SIF</label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" name="mostrarLote" defaultChecked={configuracao.mostrarLote} /> Mostrar lote</label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" name="mostrarMarcaFornecedor" defaultChecked={configuracao.mostrarMarcaFornecedor} /> Mostrar marca/fornecedor</label>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary">Salvar configuração</button>
          </div>
        </form>
      </section>

      {grupoEdicao ? (
        <ActionModal title="Editar grupo" cancelHref={OPTIONS_PATH} maxWidthClassName="max-w-3xl">
          <form action={updateGroupAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
            <input type="hidden" name="id" value={grupoEdicao.id} />
            <GroupFields
              grupos={grupos.filter((grupo) => grupo.id !== grupoEdicao.id).map((grupo) => ({ id: grupo.id, nome: grupo.nome }))}
              defaults={grupoEdicao}
            />
            <ModalActions>
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">Cancelar</Link>
              <button type="submit" className="btn-primary">Salvar grupo</button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {produtoEdicao ? (
        <ActionModal title="Editar produto" cancelHref={OPTIONS_PATH} maxWidthClassName="max-w-3xl">
          <form action={updateProductAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
            <input type="hidden" name="id" value={produtoEdicao.id} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome *
              <input name="nome" required defaultValue={produtoEdicao.nome} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Unidade padrão *
              <select name="unidadePadrao" required defaultValue={produtoEdicao.unidadePadrao} className={INPUT_CLASS}>
                {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Grupos/Subgrupos *
              <select name="grupoIds" multiple required defaultValue={produtoEdicao.grupos.map((item) => String(item.grupoId))} className={INPUT_CLASS}>
                {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select name="ativo" defaultValue={produtoEdicao.ativo ? "true" : "false"} className={INPUT_CLASS}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Observação
              <textarea name="observacao" rows={3} defaultValue={produtoEdicao.observacao ?? ""} className={INPUT_CLASS} />
            </label>
            <ModalActions>
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">Cancelar</Link>
              <button type="submit" className="btn-primary">Salvar produto</button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {metodoEdicao ? (
        <ActionModal title="Editar método" cancelHref={OPTIONS_PATH} maxWidthClassName="max-w-3xl">
          <form action={updateMethodAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
            <input type="hidden" name="id" value={metodoEdicao.id} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome *
              <input name="nome" required defaultValue={metodoEdicao.nome} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Tipo
              <input name="tipo" defaultValue={metodoEdicao.tipo ?? ""} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Ordem
              <input name="ordem" type="number" min={0} defaultValue={metodoEdicao.ordem} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select name="ativo" defaultValue={metodoEdicao.ativo ? "true" : "false"} className={INPUT_CLASS}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <ModalActions>
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">Cancelar</Link>
              <button type="submit" className="btn-primary">Salvar método</button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {regraEdicao ? (
        <ActionModal title="Editar regra" cancelHref={OPTIONS_PATH} maxWidthClassName="max-w-3xl">
          <form action={updateValidityRuleAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={OPTIONS_PATH} />
            <input type="hidden" name="id" value={regraEdicao.id} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Produto específico
              <select name="produtoId" defaultValue={regraEdicao.produtoId ?? ""} className={INPUT_CLASS}>
                <option value="">Regra por grupo/geral</option>
                {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Grupo/Subgrupo
              <select name="grupoId" defaultValue={regraEdicao.grupoId ?? ""} className={INPUT_CLASS}>
                <option value="">Regra geral do método</option>
                {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Método *
              <select name="metodoId" required defaultValue={regraEdicao.metodoId} className={INPUT_CLASS}>
                {metodos.map((metodo) => <option key={metodo.id} value={metodo.id}>{metodo.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Prioridade
              <input name="prioridade" type="number" min={0} defaultValue={regraEdicao.prioridade} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Validade dias
              <input name="validadeDias" type="number" min={1} defaultValue={regraEdicao.validadeDias ?? ""} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Validade horas
              <input name="validadeHoras" type="number" min={1} defaultValue={regraEdicao.validadeHoras ?? ""} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Temperatura/referência
              <input name="temperaturaReferencia" defaultValue={regraEdicao.temperaturaReferencia ?? ""} className={INPUT_CLASS} />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Status
              <select name="ativo" defaultValue={regraEdicao.ativo ? "true" : "false"} className={INPUT_CLASS}>
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" name="exigeValidadeManual" defaultChecked={regraEdicao.exigeValidadeManual} />
              Exige validade manual
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Observação
              <textarea name="observacao" rows={3} defaultValue={regraEdicao.observacao ?? ""} className={INPUT_CLASS} />
            </label>
            <ModalActions>
              <Link href={OPTIONS_PATH} className="btn-secondary text-center">Cancelar</Link>
              <button type="submit" className="btn-primary">Salvar regra</button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
