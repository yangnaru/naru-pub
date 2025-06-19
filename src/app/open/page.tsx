import { db } from "@/lib/database";
import UserGrowthChart from "./user-growth-chart";
import ActiveSessionsChart from "./active-sessions-chart";

async function getUserGrowthData() {
  const users = await db
    .selectFrom("users")
    .select(["created_at"])
    .orderBy("created_at", "asc")
    .execute();

  // Group users by month and count cumulative growth
  const monthlyData = users.reduce((acc, user) => {
    const month = new Date(user.created_at).toISOString().slice(0, 7); // YYYY-MM format
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convert to cumulative data
  let cumulative = 0;
  const chartData = Object.entries(monthlyData).map(([month, count]) => {
    cumulative += count;
    return {
      month,
      users: cumulative,
    };
  });

  return chartData;
}

async function getActiveSessionsData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessions = await db
    .selectFrom("sessions")
    .select(["expires_at"])
    .where("expires_at", ">", now)
    .where("expires_at", ">", thirtyDaysAgo)
    .orderBy("expires_at", "asc")
    .execute();

  // Group sessions by date
  const dailyData = sessions.reduce((acc, session) => {
    const date = new Date(session.expires_at).toISOString().slice(0, 10); // YYYY-MM-DD format
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convert to chart data format
  const chartData = Object.entries(dailyData).map(([date, count]) => ({
    date,
    sessions: count,
  }));

  return chartData;
}

export default async function OpenPage() {
  const userGrowthData = await getUserGrowthData();
  const activeSessionsData = await getActiveSessionsData();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">지표</h2>
        <p className="text-muted-foreground">나루의 지표를 확인해보세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserGrowthChart data={userGrowthData} />
        <ActiveSessionsChart data={activeSessionsData} />
      </div>
    </div>
  );
}
