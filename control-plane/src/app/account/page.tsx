import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import DownloadDirectoryButton from "./DownloadDirectoryButton";
import { DiscoverabilityForm } from "./DiscoverabilityForm";
import ChangePasswordForm from "./ChangePasswordForm";
import EmailManagement from "./EmailManagement";

export default async function AccountPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Card className="bg-white border-2 border-gray-300 shadow-lg">
          <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
            <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
              👤 계정 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-gray-700 text-base leading-relaxed mb-2">
                안녕하세요, <strong className="text-blue-800">{user.loginName}</strong>님!
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                나루와 {user.createdAt.getFullYear()}년{" "}
                {user.createdAt.getMonth() + 1}
                월부터 함께해 주셨어요.
              </p>
            </div>
          </CardContent>
        </Card>

        <EmailManagement
          currentEmail={user.email}
          emailVerifiedAt={user.emailVerifiedAt}
        />
        <DiscoverabilityForm discoverable={user.discoverable} />
        <ChangePasswordForm />

        <Card className="bg-white border-2 border-gray-300 shadow-lg">
          <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
            <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
              ⚙️ 계정 작업
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-row gap-4 flex-wrap">
              <DownloadDirectoryButton />
              <LogoutButton />
              <DeleteAccountButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
