import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-session";
import {
  buildDownloadFileName,
  canAccessDocumentoModulo
} from "@/lib/documentos-tecnicos";
import { prisma } from "@/lib/prisma";
import { canManageTechnicalDocuments } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildContentDisposition(fileName: string): string {
  const safeFileName = buildDownloadFileName(fileName);
  const encodedFileName = encodeURIComponent(safeFileName);

  return `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
  }

  const documento = await prisma.documentoTecnicoAnexo.findUnique({
    where: { id },
    select: {
      modulo: true,
      ativo: true,
      arquivoNome: true,
      arquivoMimeType: true,
      arquivoConteudo: true
    }
  });

  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const canManage = canManageTechnicalDocuments(user.perfil);
  if (!canAccessDocumentoModulo(user.perfil, documento.modulo)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (!documento.ativo && !canManage) {
    return NextResponse.json({ error: "Documento indisponível." }, { status: 403 });
  }

  const bytes = Buffer.from(documento.arquivoConteudo);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": documento.arquivoMimeType || "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": buildContentDisposition(documento.arquivoNome),
      "Cache-Control": "private, no-store"
    }
  });
}
