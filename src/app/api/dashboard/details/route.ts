import { NextResponse } from "next/server";

import {
  getDashboardCardDetails,
  parseDashboardPeriod
} from "@/app/dashboard/service";
import type { DashboardDetailKind } from "@/app/dashboard/types";
import { getCurrentUser } from "@/lib/auth-session";

function parseKind(value: string | null): DashboardDetailKind | null {
  if (value === "pending" || value === "completed") {
    return value;
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
  const cardId = url.searchParams.get("cardId") ?? "";
  const kind = parseKind(url.searchParams.get("kind"));

  if (!cardId || !kind) {
    return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const details = await getDashboardCardDetails({
      user,
      period,
      startDate,
      endDate,
      cardId,
      kind
    });

    return NextResponse.json(details);
  } catch (error) {
    console.error("[dashboard] Falha ao buscar detalhes", error);
    return NextResponse.json(
      {
        cardId,
        kind,
        total: 0,
        details: []
      },
      { status: 200 }
    );
  }
}
