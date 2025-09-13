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
  const currentStats = await getCurrentStorageStats();
  const homeDirectorySizeDistributionData =
    await getHomeDirectorySizeDistributionData();

  return (
    <div className="w-full p-6 space-y-8">
      <div className="bg-white border-2 border-gray-300  rounded-lg p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">📊 지표</h2>
        <p className="text-gray-600">나루의 사용 현황과 통계를 확인해보세요.</p>
      </div>

      {/* Current Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-2 border-gray-300 ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-100 border-b border-gray-300">
            <CardTitle className="text-sm font-medium text-gray-800">
              총 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">
              {formatBytes(currentStats.totalSize)}
            </div>
            <p className="text-xs text-gray-600">
              {currentStats.userCount}명의 사용자
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-gray-300 ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-100 border-b border-gray-300">
            <CardTitle className="text-sm font-medium text-gray-800">
              평균 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">
              {formatBytes(currentStats.averageSize)}
            </div>
            <p className="text-xs text-gray-600">사용자당 평균</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-gray-300 ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-100 border-b border-gray-300">
            <CardTitle className="text-sm font-medium text-gray-800">
              최대 저장 용량
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">
              {formatBytes(currentStats.maxSize)}
            </div>
            <p className="text-xs text-gray-600">가장 큰 갠홈</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-gray-300 ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-100 border-b border-gray-300">
            <CardTitle className="text-sm font-medium text-gray-800">
              활성 사용자
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800">
              {currentStats.userCount}명
            </div>
            <p className="text-xs text-gray-600">저장 용량이 계산된 사용자</p>
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
