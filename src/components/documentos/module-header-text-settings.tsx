import { ModuloDocumento } from "@prisma/client";

import { getDocumentoModuloLabel } from "@/lib/documentos-tecnicos";
import { prisma } from "@/lib/prisma";

import { updateModuloCabecalhoAction } from "@/app/configuracoes-modulo/actions";

type ModuleHeaderTextSettingsProps = {
  modulo: ModuloDocumento;
  returnTo: string;
};

export async function ModuleHeaderTextSettings({
  modulo,
  returnTo
}: ModuleHeaderTextSettingsProps) {
  const configuracao = await prisma.moduloConfiguracao.findUnique({
    where: { modulo },
    select: {
      textoCabecalho: true
    }
  });

  const textoAtual = configuracao?.textoCabecalho ?? "";

  return (
    <section className="bpma-card">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Texto do cabeçalho
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Configure a orientação exibida abaixo do título em {getDocumentoModuloLabel(modulo)}.
      </p>

      <form action={updateModuloCabecalhoAction} className="mt-4 grid gap-3">
        <input type="hidden" name="modulo" value={modulo} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Orientação do módulo
          <textarea
            name="textoCabecalho"
            rows={4}
            maxLength={2000}
            defaultValue={textoAtual}
            className="bpma-input"
            placeholder="Digite o texto que aparecerá no cabeçalho do módulo."
          />
        </label>
        <div className="btn-group">
          <button type="submit" className="btn-primary">
            Salvar texto
          </button>
          {textoAtual ? (
            <button
              type="submit"
              name="limparTextoCabecalho"
              value="true"
              className="btn-secondary"
            >
              Limpar texto
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
