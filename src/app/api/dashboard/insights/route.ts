import { NextResponse } from "next/server";

import {
  getDashboardInsightDetails,
  parseDashboardPeriod
} from "@/app/dashboard/service";
import type { DashboardInsightId } from "@/app/dashboard/types";
import { getCurrentUser } from "@/lib/auth-session";

const SECTION_IDS: DashboardInsightId[] = [
  "risco-operacional",
  "alertas-operacionais",
  "nao-conformidades",
  "acoes-corretivas"
];

function parseSectionId(value: string | null): DashboardInsightId | null {
  if (SECTION_IDS.includes(value as DashboardInsightId)) {
    return value as DashboardInsightId;
  }

  return null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = parseDashboardPeriod(url.searchParams.get("period") ?? "");
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const sectionId = parseSectionId(url.searchParams.get("sectionId"));

  if (!sectionId) {
    return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const details = await getDashboardInsightDetails({
      user,
      period,
      startDate,
      endDate,
      sectionId
    });

    return NextResponse.json(details);
  } catch (error) {
    console.error("[dashboard] Falha ao buscar detalhes de indicador", error);
    return NextResponse.json(
      {
        sectionId,
        total: 0,
        details: []
      },
      { status: 200 }
    );
  }
}
