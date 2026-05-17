import { redirect } from "next/navigation";

import { OperationalDashboard } from "@/app/dashboard/components/operational-dashboard";
import {
  getOperationalDashboardData,
  parseDashboardPeriod
} from "@/app/dashboard/service";
import { getCurrentUser } from "@/lib/auth-session";

type SearchParams = Record<string, string | string[] | undefined>;
type HomePageProps = {
  searchParams: Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const period = parseDashboardPeriod(firstParam(params.period));
  const dashboardData = await getOperationalDashboardData({
    user,
    period,
    startDate: firstParam(params.startDate),
    endDate: firstParam(params.endDate)
  });

  return <OperationalDashboard data={dashboardData} />;
}
