import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionModal, ModalActions } from "@/components/ui/action-modal";
import { getCurrentUser } from "@/lib/auth-session";
import { formatAppDateInput } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import {
  canManageUsers,
  CUSTOMER_USER_ROLE_VALUES,
  getRoleLabel,
  USER_ROLE_VALUES,
  type UserRole
} from "@/lib/rbac";

import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  updateUserAction
} from "./actions";

const CARD_CLASS =
  "bpma-card";
const INPUT_CLASS =
  "bpma-input";

type SearchParams = Record<string, string | string[] | undefined>;
type UsuariosPageProps = {
  searchParams: Promise<SearchParams>;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateInput(date: Date | null): string {
  return date ? formatAppDateInput(date) : "";
}

function normalizeRoleInput(value: string, fallback: UserRole): UserRole {
  return USER_ROLE_VALUES.includes(value as UserRole) ? (value as UserRole) : fallback;
}

function normalizeStatusInput(value: string, fallback: "ATIVO" | "INATIVO"): "ATIVO" | "INATIVO" {
  return value === "INATIVO" || value === "ATIVO" ? value : fallback;
}

export const dynamic = "force-dynamic";

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const authUser = await getCurrentUser();
  if (!authUser || !canManageUsers(authUser.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const editError = firstParam(params.editError).trim();
  const editId = Number(firstParam(params.editId));
  const resetId = Number(firstParam(params.resetId));
  const statusId = Number(firstParam(params.statusId));
  const deleteId = Number(firstParam(params.deleteId));

  const usuarios = await prisma.usuario.findMany({
    where: {
      isDevDefinitivo: false,
      perfil: { not: "DEV" }
    },
    orderBy: [{ createdAt: "desc" }]
  });
  const usuarioEdicao =
    Number.isInteger(editId) && editId > 0 ? usuarios.find((item) => item.id === editId) : null;
  const usuarioResetSenha =
    Number.isInteger(resetId) && resetId > 0 ? usuarios.find((item) => item.id === resetId) : null;
  const usuarioStatus =
    Number.isInteger(statusId) && statusId > 0 ? usuarios.find((item) => item.id === statusId) : null;
  const usuarioRemocao =
    Number.isInteger(deleteId) && deleteId > 0 ? usuarios.find((item) => item.id === deleteId) : null;
  const hasEditDraft = Boolean(usuarioEdicao && editError);
  const modalError = feedback && feedbackType === "error" ? feedback : "";

  const editNomeCompleto = hasEditDraft
    ? firstParam(params.editNomeCompleto)
    : usuarioEdicao?.nomeCompleto ?? "";
  const editNomeUsuario = hasEditDraft
    ? firstParam(params.editNomeUsuario)
    : usuarioEdicao?.nomeUsuario ?? "";
  const editPerfil = usuarioEdicao
    ? hasEditDraft
      ? normalizeRoleInput(firstParam(params.editPerfil), usuarioEdicao.perfil as UserRole)
      : (usuarioEdicao.perfil as UserRole)
    : "COLABORADOR";
  const editStatus = usuarioEdicao
    ? hasEditDraft
      ? normalizeStatusInput(
          firstParam(params.editStatus),
          usuarioEdicao.status === "INATIVO" ? "INATIVO" : "ATIVO"
        )
      : (usuarioEdicao.status === "INATIVO" ? "INATIVO" : "ATIVO")
    : "ATIVO";
  const editDataAdmissao = hasEditDraft
    ? firstParam(params.editDataAdmissao)
    : formatDateInput(usuarioEdicao?.dataAdmissao ?? null);
  const editObservacoesInternas = hasEditDraft
    ? firstParam(params.editObservacoesInternas)
    : usuarioEdicao?.observacoesInternas ?? "";
  const editObrigarTrocaSenha = hasEditDraft
    ? firstParam(params.editObrigarTrocaSenha) !== "0"
    : usuarioEdicao?.obrigarTrocaSenha ?? false;

  return (
    <div className="space-y-6 dark:text-slate-100">
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Gestão de Usuários
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Cadastro, edição, inativação e redefinição de senha.
            </p>
          </div>
          <div className="btn-group">
            <Link href="/usuarios/solicitacoes" className="btn-secondary">
              Solicitações de Redefinição
            </Link>
          </div>
        </div>
      </section>

      {feedback ? (
        <section
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedbackType === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {feedback}
        </section>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Novo Usuário
        </h2>
        <form action={createUserAction} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Nome Completo *
            <input name="nomeCompleto" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Nome de Usuário *
            <input name="nomeUsuario" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Perfil *
            <select name="perfil" required className={INPUT_CLASS}>
              {CUSTOMER_USER_ROLE_VALUES.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Status
            <select name="status" defaultValue="ATIVO" className={INPUT_CLASS}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Data de Admissão
            <input type="date" name="dataAdmissao" className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Senha Inicial *
            <input type="text" name="senhaInicial" required className={INPUT_CLASS} />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            Observações Internas
            <textarea name="observacoesInternas" rows={2} className={INPUT_CLASS} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
            <input type="checkbox" name="obrigarTrocaSenha" defaultChecked />
            Obrigar troca no próximo acesso
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Criar Usuário
            </button>
          </div>
        </form>
      </section>

      {usuarioEdicao ? (
        <div className="bpma-modal-backdrop">
          <section className="bpma-modal-panel max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Editar Usuário
            </h2>

            {editError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {editError}
              </p>
            ) : null}

            {usuarioEdicao.isDevDefinitivo ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Este usuário é o DEV definitivo e não pode ter login/perfil/status alterados para
                garantir continuidade técnica do sistema.
              </p>
            ) : null}

            <form action={updateUserAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="userId" value={String(usuarioEdicao.id)} />
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome Completo *
                <input name="nomeCompleto" defaultValue={editNomeCompleto} required className={INPUT_CLASS} />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Nome de Usuário *
                <input name="nomeUsuario" defaultValue={editNomeUsuario} required className={INPUT_CLASS} />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Perfil *
                <select name="perfil" defaultValue={editPerfil} required className={INPUT_CLASS}>
                  {CUSTOMER_USER_ROLE_VALUES.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Status
                <select name="status" defaultValue={editStatus} className={INPUT_CLASS}>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Data de Admissão
                <input
                  type="date"
                  name="dataAdmissao"
                  defaultValue={editDataAdmissao}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                Observações Internas
                <textarea
                  name="observacoesInternas"
                  rows={2}
                  defaultValue={editObservacoesInternas}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                <input
                  type="checkbox"
                  name="obrigarTrocaSenha"
                  defaultChecked={editObrigarTrocaSenha}
                />
                Obrigar troca no próximo acesso
              </label>
              <div className="mt-1 flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
                <Link href="/usuarios" className="btn-secondary text-center">
                  Cancelar
                </Link>
                <button type="submit" className="btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {usuarioResetSenha ? (
        <ActionModal
          title="Redefinir Senha"
          cancelHref="/usuarios"
          description={
            <p>
              Usuário selecionado: <strong>{usuarioResetSenha.nomeCompleto}</strong> (
              {usuarioResetSenha.nomeUsuario}).
            </p>
          }
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          <form action={resetUserPasswordAction} className="mt-4 grid gap-3">
            <input type="hidden" name="userId" value={String(usuarioResetSenha.id)} />
            <input type="hidden" name="returnTo" value={`/usuarios?resetId=${usuarioResetSenha.id}`} />
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Senha Temporária (Opcional)
              <input
                type="text"
                name="senhaTemporaria"
                placeholder="Deixe em branco para gerar automaticamente"
                className={INPUT_CLASS}
              />
            </label>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              O usuário será obrigado a trocar a senha no próximo acesso.
            </p>
            <ModalActions>
              <Link href="/usuarios" className="btn-secondary text-center">
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Redefinir Senha
              </button>
            </ModalActions>
          </form>
        </ActionModal>
      ) : null}

      {usuarioStatus ? (
        <ActionModal
          title={usuarioStatus.status === "ATIVO" ? "Inativar Usuário" : "Reativar Usuário"}
          cancelHref="/usuarios"
          description={
            <p>
              Usuário selecionado: <strong>{usuarioStatus.nomeCompleto}</strong> (
              {usuarioStatus.nomeUsuario}).
            </p>
          }
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          {usuarioStatus.isDevDefinitivo || usuarioStatus.id === authUser.id ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Esta ação está protegida para evitar perda de acesso técnico.
            </p>
          ) : (
            <form action={toggleUserStatusAction} className="mt-4">
              <input type="hidden" name="userId" value={String(usuarioStatus.id)} />
              <input
                type="hidden"
                name="status"
                value={usuarioStatus.status === "ATIVO" ? "INATIVO" : "ATIVO"}
              />
              <input type="hidden" name="returnTo" value={`/usuarios?statusId=${usuarioStatus.id}`} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {usuarioStatus.status === "ATIVO"
                  ? "Confirme para bloquear novos acessos deste usuário."
                  : "Confirme para liberar o acesso deste usuário novamente."}
              </p>
              <ModalActions>
                <Link href="/usuarios" className="btn-secondary text-center">
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className={usuarioStatus.status === "ATIVO" ? "btn-danger" : "btn-primary"}
                >
                  {usuarioStatus.status === "ATIVO" ? "Inativar" : "Reativar"}
                </button>
              </ModalActions>
            </form>
          )}
        </ActionModal>
      ) : null}

      {usuarioRemocao ? (
        <ActionModal
          title="Remover Usuário"
          cancelHref="/usuarios"
          description={
            <p>
              Usuário selecionado: <strong>{usuarioRemocao.nomeCompleto}</strong> (
              {usuarioRemocao.nomeUsuario}).
            </p>
          }
        >
          {modalError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          ) : null}
          {usuarioRemocao.isDevDefinitivo || usuarioRemocao.id === authUser.id ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Este usuário não pode ser removido por proteção de acesso.
            </p>
          ) : (
            <form action={deleteUserAction} className="mt-4">
              <input type="hidden" name="userId" value={String(usuarioRemocao.id)} />
              <input type="hidden" name="returnTo" value={`/usuarios?deleteId=${usuarioRemocao.id}`} />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Esta ação remove o cadastro quando não há histórico vinculado. Se houver vínculos,
                o sistema bloqueará a remoção e manterá este modal aberto.
              </p>
              <ModalActions>
                <Link href="/usuarios" className="btn-secondary text-center">
                  Cancelar
                </Link>
                <button type="submit" className="btn-danger">
                  Remover Usuário
                </button>
              </ModalActions>
            </form>
          )}
        </ActionModal>
      ) : null}

      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Usuários Cadastrados ({usuarios.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="px-3 py-2">{usuario.nomeCompleto}</td>
                    <td className="px-3 py-2">{usuario.nomeUsuario}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{getRoleLabel(usuario.perfil as UserRole)}</span>
                        {usuario.isDevDefinitivo ? (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            DEV Definitivo
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">{usuario.status === "ATIVO" ? "Ativo" : "Inativo"}</td>
                    <td className="px-3 py-2">
                      <div className="btn-group">
                        <Link
                          href={`/usuarios?editId=${usuario.id}`}
                          className="btn-action"
                        >
                          Editar
                        </Link>
                        {usuario.isDevDefinitivo || usuario.id === authUser.id ? (
                          <button
                            type="button"
                            disabled
                            className={usuario.status === "ATIVO" ? "btn-danger" : "btn-secondary"}
                          >
                            {usuario.status === "ATIVO" ? "Inativar" : "Ativar"}
                          </button>
                        ) : (
                          <Link
                            href={`/usuarios?statusId=${usuario.id}`}
                            className={usuario.status === "ATIVO" ? "btn-danger" : "btn-secondary"}
                          >
                            {usuario.status === "ATIVO" ? "Inativar" : "Ativar"}
                          </Link>
                        )}
                        <Link href={`/usuarios?resetId=${usuario.id}`} className="btn-secondary">
                          Redefinir Senha
                        </Link>
                        {usuario.isDevDefinitivo || usuario.id === authUser.id ? (
                          <button
                            type="button"
                            className="btn-danger"
                            disabled
                          >
                            Remover
                          </button>
                        ) : (
                          <Link href={`/usuarios?deleteId=${usuario.id}`} className="btn-danger">
                            Remover
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
