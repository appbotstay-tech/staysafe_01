import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth-session";
import { canAccessReports } from "@/lib/rbac";

import { buildExportFileName, generateCsv, generateReport, type ReportSearchParams } from "../report-service";

export const dynamic = "force-dynamic";

function paramsFromUrl(request: NextRequest): ReportSearchParams {
  const result: ReportSearchParams = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessReports(user.perfil)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const searchParams = paramsFromUrl(request);
  const moduleId = request.nextUrl.searchParams.get("module") ?? "geral";
  const reportId = request.nextUrl.searchParams.get("report") ?? "resumo-geral";
  const report = await generateReport({ moduleId, reportId, searchParams, user });
  const csv = generateCsv(report);

  return new NextResponse(`\ufeff${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildExportFileName(report)}"`
    }
  });
}
