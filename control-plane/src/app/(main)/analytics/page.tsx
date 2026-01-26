import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/database";
import { sql } from "kysely";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Eye, TrendingUp } from "lucide-react";
import PageviewsChart from "./pageviews-chart";
import TopPagesTable from "./top-pages-table";

async function getDailyPageviews(userId: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .selectFrom("pageviews")
    .select([
      sql<string>`TO_CHAR(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')`.as("date"),
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .where("timestamp", ">=", thirtyDaysAgo)
    .groupBy(sql`TO_CHAR(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
    .orderBy("date", "asc")
    .execute();

  // Fill in missing dates with zero values
  const chartData = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    const found = results.find((r) => r.date === dateStr);
    chartData.push({
      date: dateStr,
      views: found ? Number(found.views) : 0,
      uniqueVisitors: found ? Number(found.unique_visitors) : 0,
    });
  }

  return chartData;
}

async function getTopPages(userId: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .selectFrom("pageviews")
    .select([
      "path",
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .where("timestamp", ">=", thirtyDaysAgo)
    .groupBy("path")
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(10)
    .execute();

  return results.map((r) => ({
    path: r.path,
    views: Number(r.views),
    uniqueVisitors: Number(r.unique_visitors),
  }));
}

async function getStats(userId: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Today's stats
  const todayStats = await db
    .selectFrom("pageviews")
    .select([
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .where("timestamp", ">=", todayStart)
    .executeTakeFirst();

  // Last 7 days stats
  const weekStats = await db
    .selectFrom("pageviews")
    .select([
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .where("timestamp", ">=", sevenDaysAgo)
    .executeTakeFirst();

  // Last 30 days stats
  const monthStats = await db
    .selectFrom("pageviews")
    .select([
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .where("timestamp", ">=", thirtyDaysAgo)
    .executeTakeFirst();

  // All time stats
  const allTimeStats = await db
    .selectFrom("pageviews")
    .select([
      sql<number>`COUNT(*)`.as("views"),
      sql<number>`COUNT(DISTINCT ip)`.as("unique_visitors"),
    ])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  return {
    today: {
      views: Number(todayStats?.views ?? 0),
      uniqueVisitors: Number(todayStats?.unique_visitors ?? 0),
    },
    week: {
      views: Number(weekStats?.views ?? 0),
      uniqueVisitors: Number(weekStats?.unique_visitors ?? 0),
    },
    month: {
      views: Number(monthStats?.views ?? 0),
      uniqueVisitors: Number(monthStats?.unique_visitors ?? 0),
    },
    allTime: {
      views: Number(allTimeStats?.views ?? 0),
      uniqueVisitors: Number(allTimeStats?.unique_visitors ?? 0),
    },
  };
}

export default async function AnalyticsPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/login");
  }

  const [dailyPageviews, topPages, stats] = await Promise.all([
    getDailyPageviews(user.id),
    getTopPages(user.id),
    getStats(user.id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="bg-secondary border-b-2 border-border">
            <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
              <BarChart3 size={20} /> 사이트 분석
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-base leading-relaxed">
              <strong className="text-primary">{user.loginName}</strong>님의
              사이트 방문 현황을 확인하세요.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-2 border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
              <CardTitle className="text-sm font-medium text-foreground">
                오늘
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.today.views}
              </div>
              <p className="text-xs text-muted-foreground">
                순방문자 {stats.today.uniqueVisitors}명
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-2 border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
              <CardTitle className="text-sm font-medium text-foreground">
                최근 7일
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.week.views}
              </div>
              <p className="text-xs text-muted-foreground">
                순방문자 {stats.week.uniqueVisitors}명
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-2 border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
              <CardTitle className="text-sm font-medium text-foreground">
                최근 30일
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.month.views}
              </div>
              <p className="text-xs text-muted-foreground">
                순방문자 {stats.month.uniqueVisitors}명
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-2 border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
              <CardTitle className="text-sm font-medium text-foreground">
                전체 기간
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.allTime.views}
              </div>
              <p className="text-xs text-muted-foreground">
                순방문자 {stats.allTime.uniqueVisitors}명
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PageviewsChart data={dailyPageviews} />
          <TopPagesTable data={topPages} />
        </div>
      </div>
    </div>
  );
}
