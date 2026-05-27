import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth-session";
import { APP_TIME_ZONE, formatAppDateInput, getAppDate, getAppNow } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { canAccessValidityLabels } from "@/lib/rbac";

import {
  CARD_CLASS,
  DEFAULT_PRINT_CONFIG,
  HISTORY_PATH,
  MODULE_PATH,
  OPTIONS_PATH,
  type PrintConfig
} from "./constants";
import { EtiquetaCard, EtiquetaPrintStyles } from "./label-card";
import { LabelGeneratorForm } from "./label-generator-form";
import { PrintButton } from "./print-button";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

export const dynamic = "force-dynamic";

const APP_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function EtiquetasValidadePage({ searchParams }: PageProps) {
  const user = await requireAuthenticatedUser();
  if (!canAccessValidityLabels(user.perfil)) {
    redirect("/acesso-negado");
  }

  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const etiquetaId = parsePositiveInt(firstParam(params.etiquetaId).trim());

  const [
    grupos,
    produtos,
    metodos,
    regras,
    etiquetaVisualizacao,
    configuracaoDb
  ] = await Promise.all([
    prisma.etiquetaValidadeGrupo.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeProduto.findMany({
      where: { ativo: true },
      include: { grupos: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.etiquetaValidadeMetodo.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }]
    }),
    prisma.etiquetaValidadeRegra.findMany({
      where: { ativo: true, metodo: { ativo: true } },
      orderBy: [{ prioridade: "desc" }, { id: "asc" }]
    }),
    etiquetaId
      ? prisma.etiquetaValidadeEmissao.findUnique({ where: { id: etiquetaId } })
      : Promise.resolve(null),
    prisma.etiquetaValidadeConfiguracaoImpressao.findFirst({
      orderBy: { id: "asc" }
    })
  ]);

  const configuracao: PrintConfig = configuracaoDb ?? DEFAULT_PRINT_CONFIG;
  const now = getAppNow();

  return (
    <div className="space-y-6 dark:text-slate-100">
      <EtiquetaPrintStyles config={configuracao} />

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Etiquetas de Validade
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Fluxo interno StayLabel para emissão guiada por grupo, produto, conservação e regra de validade.
            </p>
            <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Módulo em desenvolvimento. Disponível apenas para DEV.
            </p>
          </div>
          <div className="btn-group">
            <Link href={OPTIONS_PATH} className="btn-secondary">
              Gerenciar
            </Link>
            <Link href={HISTORY_PATH} className="btn-secondary">
              Histórico Completo
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
        <LabelGeneratorForm
          grupos={grupos.map((grupo) => ({
            id: grupo.id,
            nome: grupo.nome,
            grupoPaiId: grupo.grupoPaiId,
            icone: grupo.icone
          }))}
          produtos={produtos.map((produto) => ({
            id: produto.id,
            nome: produto.nome,
            unidadePadrao: produto.unidadePadrao,
            grupos: produto.grupos.map((grupo) => grupo.grupoId)
          }))}
          metodos={metodos.map((metodo) => ({
            id: metodo.id,
            nome: metodo.nome,
            tipo: metodo.tipo,
            icone: metodo.icone
          }))}
          regras={regras.map((regra) => ({
            id: regra.id,
            produtoId: regra.produtoId,
            grupoId: regra.grupoId,
            metodoId: regra.metodoId,
            validadeDias: regra.validadeDias,
            validadeHoras: regra.validadeHoras,
            exigeValidadeManual: regra.exigeValidadeManual,
            temperaturaReferencia: regra.temperaturaReferencia,
            prioridade: regra.prioridade
          }))}
          responsavelNome={user.nomeCompleto}
          defaultDate={formatAppDateInput(getAppDate(now))}
          defaultTime={APP_TIME_FORMATTER.format(now)}
          returnTo={MODULE_PATH}
        />
      </section>

      {etiquetaVisualizacao ? (
        <section className={CARD_CLASS}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Etiqueta gerada
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Visualização HTML/CSS imprimível, preparada para Zebra ZD220 em fase futura.
              </p>
            </div>
            <PrintButton />
          </div>
          <EtiquetaCard etiqueta={etiquetaVisualizacao} config={configuracao} />
        </section>
      ) : null}
    </div>
  );
}
