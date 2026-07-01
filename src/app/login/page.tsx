import Image from "next/image";
import Link from "next/link";

import { PasswordInput } from "@/components/auth/password-input";
import { APP_DESCRIPTION } from "@/lib/app-branding";

import { loginAction } from "./actions";

const INPUT_CLASS =
  "bpma-input";

type SearchParams = Record<string, string | string[] | undefined>;
type LoginPageProps = {
  searchParams: Promise<SearchParams>;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const feedback = firstParam(params.feedback).trim();
  const feedbackType = firstParam(params.feedbackType) === "error" ? "error" : "success";
  const next = firstParam(params.next).trim();

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-8 dark:text-slate-100">
      <div className="w-full max-w-md">
        <div className="bpma-card">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative aspect-[14/5] w-full max-w-[280px] overflow-hidden">
              <Image
                src="/logo-staysafe.png"
                alt="StaySafe"
                fill
                priority
                sizes="280px"
                className="object-cover object-center"
              />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
              {APP_DESCRIPTION}
            </p>
          </div>

          {feedback ? (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                feedbackType === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              }`}
            >
              {feedback}
            </div>
          ) : null}

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />

            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nome de Usuário
              <input
                type="text"
                name="nomeUsuario"
                required
                autoComplete="username"
                className={`${INPUT_CLASS} mt-1`}
              />
            </label>

            <PasswordInput
              name="senha"
              label="Senha"
              required
              className={INPUT_CLASS}
            />

            <button type="submit" className="btn-primary w-full">
              Entrar
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/login/esqueci-senha"
              className="text-slate-700 underline decoration-slate-400 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              Esqueci Minha Senha
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://botstay.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            POWERED BY BOTSTAY
          </a>
        </div>
      </div>
    </section>
  );
}
