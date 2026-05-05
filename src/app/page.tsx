import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-session";
import { getModulesForRole } from "@/lib/modules";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const modules = getModulesForRole(user.perfil);

  if (user.perfil === "FUNCIONARIO") {
    const operationalCards = [
      {
        title: "Minhas Rotinas de Hoje",
        description: "Acesse rapidamente as tarefas operacionais do dia.",
        href: "/plano-limpeza/diario"
      },
      {
        title: "Temperaturas Pendentes",
        description: "Registrar temperaturas e ações corretivas dos equipamentos.",
        href: "/controle-temperatura-equipamentos"
      },
      {
        title: "Higienização de Hortifruti",
        description: "Registrar a higienização operacional do dia.",
        href: "/higienizacao-hortifruti"
      },
      {
        title: "Qualidade do Óleo",
        description: "Registrar fita, temperatura ou sem utilização no período.",
        href: "/controle-qualidade-oleo"
      },
      {
        title: "Limpezas Pendentes",
        description: "Assinar checklists diários e semanais permitidos.",
        href: "/plano-limpeza"
      },
      {
        title: "Buffet / Amostras de Hoje",
        description: "Preencher itens do serviço e adicionar item extra quando necessário.",
        href: "/controle-buffet-amostras"
      },
      {
        title: "Recebimentos em Conferência",
        description: "Conferir notas já importadas pela administração.",
        href: "/rastreabilidade-recebimento"
      },
      {
        title: "Abrir Chamado",
        description: "Registrar ocorrência de manutenção com foto e assinatura.",
        href: "/chamados-manutencao"
      }
    ];

    return (
      <section className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Rotinas de Hoje
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Acesso rápido às tarefas operacionais do dia.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {operationalCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">BPMA App</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Selecione um módulo no menu lateral para iniciar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{module.name}</h2>
          </Link>
        ))}
      </div>
    </section>
  );
}
