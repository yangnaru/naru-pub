import { db } from "@/lib/database";
import UserGrowthChart from "./user-growth-chart";
import ActiveSessionsChart from "./active-sessions-chart";
import HomeDirectorySizeDistributionChart from "./home-directory-size-distribution-chart";
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

async function getHomeDirectorySizesData() {
  const history = await db
    .selectFrom("home_directory_size_history")
    .innerJoin("users", "users.id", "home_directory_size_history.user_id")
    .select([
      "home_directory_size_history.size_bytes",
      "home_directory_size_history.recorded_at",
    ])
    .orderBy("home_directory_size_history.recorded_at", "asc")
    .execute();

  // Group by month and sum the sizes
  const monthlyData = history.reduce((acc, record) => {
    const month = new Date(record.recorded_at).toISOString().slice(0, 7); // YYYY-MM format
    acc[month] = (acc[month] || 0) + record.size_bytes;
    return acc;
  }, {} as Record<string, number>);

  // Convert to chart data format
  const chartData = Object.entries(monthlyData).map(([month, totalSize]) => ({
    month,
    totalSize,
  }));

  return chartData;
}

async function getAverageHomeDirectorySizesData() {
  const history = await db
    .selectFrom("home_directory_size_history")
    .innerJoin("users", "users.id", "home_directory_size_history.user_id")
    .select([
      "home_directory_size_history.size_bytes",
      "home_directory_size_history.recorded_at",
    ])
    .orderBy("home_directory_size_history.recorded_at", "asc")
    .execute();

  // Group by month and calculate average sizes
  const monthlyData = history.reduce((acc, record) => {
    const month = new Date(record.recorded_at).toISOString().slice(0, 7); // YYYY-MM format
    if (!acc[month]) {
      acc[month] = { totalSize: 0, recordCount: 0 };
    }
    acc[month].totalSize += record.size_bytes;
    acc[month].recordCount += 1;
    return acc;
  }, {} as Record<string, { totalSize: number; recordCount: number }>);

  // Convert to chart data format with averages
  const chartData = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    averageSize: data.recordCount > 0 ? data.totalSize / data.recordCount : 0,
    userCount: data.recordCount,
  }));

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function OpenPage() {
  const userGrowthData = await getUserGrowthData();
  const activeSessionsData = await getActiveSessionsData();
  const homeDirectorySizesData = await getHomeDirectorySizesData();
  const averageHomeDirectorySizesData =
    await getAverageHomeDirectorySizesData();
  const currentStats = await getCurrentStorageStats();
  const homeDirectorySizeDistributionData =
    await getHomeDirectorySizeDistributionData();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">지표</h2>
        <p className="text-muted-foreground">나루의 지표를 확인해보세요.</p>
      </div>

      {/* Current Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 저장 용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(currentStats.totalSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStats.userCount}명의 사용자
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              평균 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(currentStats.averageSize)}
            </div>
            <p className="text-xs text-muted-foreground">사용자당 평균</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              최대 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(currentStats.maxSize)}
            </div>
            <p className="text-xs text-muted-foreground">가장 큰 갠홈</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.userCount}명</div>
            <p className="text-xs text-muted-foreground">
              저장 용량이 계산된 사용자
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserGrowthChart data={userGrowthData} />
        <ActiveSessionsChart data={activeSessionsData} />
        <HomeDirectorySizeDistributionChart
          data={homeDirectorySizeDistributionData}
        />
        {/* <HomeDirectorySizesChart data={homeDirectorySizesData} />
        <AverageHomeDirectorySizesChart data={averageHomeDirectorySizesData} /> */}
      </div>
    </div>
  );
}
