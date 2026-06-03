import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-session";
import { readStoredImage } from "@/lib/local-image-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const params = await context.params;

  try {
    const image = await readStoredImage(params.path ?? []);

    return new NextResponse(image.bytes, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.size),
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }
}
