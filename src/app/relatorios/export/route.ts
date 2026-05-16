import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-session";
import { canAccessReports } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessReports(user.perfil)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Exportação editável desativada. Emita o relatório em PDF pela tela de Relatórios."
    },
    { status: 410 }
  );
}
