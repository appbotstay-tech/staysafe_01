"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { toggleItemStatusAction } from "../actions";
import { normalizeSearchText } from "../utils";

export type BuffetManagementItemRow = {
  id: number;
  nome: string;
  classificacaoLabel: string;
  equipamentoLabel: string;
  servicosLabel: string;
  ordem: number;
  ativo: boolean;
  editHref: string;
};

type BuffetItemsManagementTableProps = {
  items: BuffetManagementItemRow[];
  pagePath: string;
};

export function BuffetItemsManagementTable({
  items,
  pagePath
}: BuffetItemsManagementTableProps) {
  const [itemSearch, setItemSearch] = useState("");
  const normalizedItemSearch = normalizeSearchText(itemSearch);
  const filteredItems = useMemo(() => {
    if (!normalizedItemSearch) {
      return items;
    }

    return items.filter((item) =>
      normalizeSearchText(item.nome).includes(normalizedItemSearch)
    );
  }, [items, normalizedItemSearch]);

  return (
    <div className="mt-4">
      <label className="block text-sm text-slate-700 dark:text-slate-200">
        Buscar item pelo nome
        <input
          type="search"
          value={itemSearch}
          onChange={(event) => setItemSearch(event.target.value)}
          placeholder="Digite para filtrar os itens..."
          className="bpma-input"
        />
      </label>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Classificação</th>
              <th className="px-3 py-2">Tipo de equipamento</th>
              <th className="px-3 py-2">Serviços</th>
              <th className="px-3 py-2">Ordem</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                  Nenhum item cadastrado.
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-slate-500 dark:text-slate-400">
                  Nenhum item encontrado.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.nome}</td>
                  <td className="px-3 py-2">{item.classificacaoLabel}</td>
                  <td className="px-3 py-2">{item.equipamentoLabel}</td>
                  <td className="px-3 py-2 max-w-72 whitespace-normal break-words">
                    {item.servicosLabel}
                  </td>
                  <td className="px-3 py-2">{item.ordem}</td>
                  <td className="px-3 py-2">{item.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-3 py-2">
                    <div className="btn-group">
                      <Link href={item.editHref} className="btn-action">
                        Editar
                      </Link>
                      <form action={toggleItemStatusAction}>
                        <input type="hidden" name="returnTo" value={pagePath} />
                        <input type="hidden" name="itemId" value={String(item.id)} />
                        <input
                          type="hidden"
                          name="ativo"
                          value={item.ativo ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className={item.ativo ? "btn-danger" : "btn-secondary"}
                        >
                          {item.ativo ? "Inativar" : "Ativar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
