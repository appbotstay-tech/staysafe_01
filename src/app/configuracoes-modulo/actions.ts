"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserForAction } from "@/lib/auth-session";
import { ensureCanManageOptions } from "@/lib/authz";
import {
  DOCUMENTO_MODULO_OPTIONS,
  parseModuloDocumento
} from "@/lib/documentos-tecnicos";
import { prisma } from "@/lib/prisma";
import { rethrowIfRedirectError } from "@/lib/redirect-error";

type FeedbackType = "success" | "error";

function getInputValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getReturnToPath(formData: FormData): string {
  const value = getInputValue(formData, "returnTo");

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const technicalPattern =
      /next_redirect|invalid `prisma|prismaclient|typeerror|referenceerror|syntaxerror|p20\d{2}|stack/i;
    if (technicalPattern.test(error.message)) {
      return fallback;
    }
    return error.message;
  }

  return fallback;
}

function redirectWithFeedback(
  returnTo: string,
  feedbackType: FeedbackType,
  feedback: string
): never {
  const url = new URL(returnTo, "http://localhost");
  url.searchParams.set("feedbackType", feedbackType);
  url.searchParams.set("feedback", feedback);

  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

function revalidateModuleConfigPaths(returnTo: string) {
  revalidatePath(returnTo);
  for (const option of DOCUMENTO_MODULO_OPTIONS) {
    if (option.href) {
      revalidatePath(option.href);
    }
  }
}

export async function updateModuloCabecalhoAction(formData: FormData) {
  const returnTo = getReturnToPath(formData);

  try {
    const actor = await getCurrentUserForAction();
    ensureCanManageOptions(actor);

    const modulo = parseModuloDocumento(getInputValue(formData, "modulo"));
    const limparTexto = getInputValue(formData, "limparTextoCabecalho") === "true";
    const textoCabecalhoInput = limparTexto ? "" : getInputValue(formData, "textoCabecalho");
    const textoCabecalho = textoCabecalhoInput ? textoCabecalhoInput.slice(0, 2000) : null;

    if (!modulo) {
      throw new Error("Módulo inválido para configuração de cabeçalho.");
    }

    await prisma.moduloConfiguracao.upsert({
      where: { modulo },
      create: {
        modulo,
        textoCabecalho,
        atualizadoPorUsuarioId: actor.id
      },
      update: {
        textoCabecalho,
        atualizadoPorUsuarioId: actor.id
      }
    });

    revalidateModuleConfigPaths(returnTo);
    redirectWithFeedback(
      returnTo,
      "success",
      textoCabecalho ? "Texto do cabeçalho salvo com sucesso." : "Texto do cabeçalho removido."
    );
  } catch (error) {
    rethrowIfRedirectError(error);
    redirectWithFeedback(
      returnTo,
      "error",
      getErrorMessage(error, "Não foi possível salvar o texto do cabeçalho.")
    );
  }
}
