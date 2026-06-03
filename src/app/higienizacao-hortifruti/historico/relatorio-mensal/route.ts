import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const targetUrl = new URL("/relatorios/higienizacao-hortifruti/mensal", request.url);
  const month = request.nextUrl.searchParams.get("mes");
  const year = request.nextUrl.searchParams.get("ano");

  if (month) {
    targetUrl.searchParams.set("mes", month);
  }

  if (year) {
    targetUrl.searchParams.set("ano", year);
  }

  return NextResponse.redirect(targetUrl);
}
