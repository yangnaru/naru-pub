import { db } from "@/lib/database";
import { sql } from "kysely";
import UserGrowthChart from "./user-growth-chart";
import HomeDirectorySizeDistributionChart from "./home-directory-size-distribution-chart";
import TotalPageviewsChart from "./total-pageviews-chart";
// import HomeDirectorySizesChart from "./home-directory-sizes-chart";
// import AverageHomeDirectorySizesChart from "./average-home-directory-sizes-chart";
import {
  Card,
  CardContent,
  //   CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

async function getCurrentStorageStats() {
  const users = await db
    .selectFrom("users")
    .select(["home_directory_size_bytes"])
    .where("home_directory_size_bytes_updated_at", "is not", null)
    .execute();

  const totalSize = users.reduce(
    (sum, user) => sum + (user.home_directory_size_bytes || 0),
    0
  );
  const averageSize = users.length > 0 ? totalSize / users.length : 0;
  const maxSize =
    users.length > 0
      ? Math.max(...users.map((user) => user.home_directory_size_bytes || 0))
      : 0;
  const userCount = users.length;

  return {
    totalSize,
    averageSize,
    maxSize,
    userCount,
  };
}

async function getHomeDirectorySizeDistributionData() {
  const users = await db
    .selectFrom("users")
    .select(["home_directory_size_bytes"])
    .where("home_directory_size_bytes", ">", 0)
    .where("home_directory_size_bytes_updated_at", "is not", null)
    .execute();

  return users.map((user) => ({
    sizeBytes: user.home_directory_size_bytes || 0,
  }));
}

async function getTotalPageviewsData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .selectFrom("pageview_daily_stats")
    .select([
      sql<string>`TO_CHAR(date, 'YYYY-MM-DD')`.as("date"),
      sql<number>`SUM(views)`.as("views"),
    ])
    .where("date", ">=", thirtyDaysAgo)
    .groupBy("date")
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
    });
  }

  return chartData;
}

async function getPageviewStats() {
  const allTimeViews = await db
    .selectFrom("pageview_daily_stats")
    .select(sql<number>`SUM(views)`.as("count"))
    .executeTakeFirst();

  const allTimeUniqueVisitors = await db
    .selectFrom("pageview_daily_stats")
    .select(sql<number>`SUM(unique_visitors)`.as("count"))
    .executeTakeFirst();

  return {
    allTimeViews: Number(allTimeViews?.count ?? 0),
    allTimeUniqueVisitors: Number(allTimeUniqueVisitors?.count ?? 0),
  };
}

async function getEditStats() {
  const allTimeEdits = await db
    .selectFrom("edit_daily_stats")
    .select(sql<number>`SUM(edit_count)`.as("count"))
    .executeTakeFirst();

  return {
    allTimeEdits: Number(allTimeEdits?.count ?? 0),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function OpenPage() {
  const [
    userGrowthData,
    currentStats,
    homeDirectorySizeDistributionData,
    totalPageviewsData,
    pageviewStats,
    editStats,
  ] = await Promise.all([
    getUserGrowthData(),
    getCurrentStorageStats(),
    getHomeDirectorySizeDistributionData(),
    getTotalPageviewsData(),
    getPageviewStats(),
    getEditStats(),
  ]);

  return (
    <div className="w-full p-6 space-y-8">
      <div className="bg-card border-2 border-border shadow-lg rounded-lg p-6">
        <h2 className="text-3xl font-bold text-foreground mb-2">📊 지표</h2>
        <p className="text-muted-foreground">나루의 사용 현황과 통계를 확인해보세요.</p>
      </div>

      {/* Current Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              총 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {formatBytes(currentStats.totalSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStats.userCount}명의 사용자
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              평균 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {formatBytes(currentStats.averageSize)}
            </div>
            <p className="text-xs text-muted-foreground">사용자당 평균</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              최대 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {formatBytes(currentStats.maxSize)}
            </div>
            <p className="text-xs text-muted-foreground">가장 큰 갠홈</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              활성 사용자
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {currentStats.userCount}명
            </div>
            <p className="text-xs text-muted-foreground">저장 용량이 계산된 사용자</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              전체 조회수
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {pageviewStats.allTimeViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">누적 페이지뷰</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              전체 순방문자
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {pageviewStats.allTimeUniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">누적 순방문자</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary border-b-2 border-border">
            <CardTitle className="text-sm font-medium text-foreground">
              전체 편집
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {editStats.allTimeEdits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">누적 파일 편집</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserGrowthChart data={userGrowthData} />
        <TotalPageviewsChart data={totalPageviewsData} />
        <HomeDirectorySizeDistributionChart
          data={homeDirectorySizeDistributionData}
        />
      </div>
    </div>
  );
}
