import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import { DiscoverabilityForm } from "./DiscoverabilityForm";
import ChangePasswordForm from "./ChangePasswordForm";
import EmailManagement from "./EmailManagement";

export default async function AccountPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white border-2 border-gray-300  rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">👤 계정 관리</h1>
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <p className="text-lg text-gray-700 mb-2">
            안녕하세요, <strong>{user.loginName}</strong>님!
          </p>
          <p className="text-gray-600">
            나루와 {user.createdAt.getFullYear()}년{" "}
            {user.createdAt.getMonth() + 1}
            월부터 함께해 주셨어요.
          </p>
        </div>
      </div>

      <EmailManagement
        currentEmail={user.email}
        emailVerifiedAt={user.emailVerifiedAt}
      />
      <DiscoverabilityForm discoverable={user.discoverable} />
      <ChangePasswordForm />

      <div className="bg-white border-2 border-gray-300  rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">계정 작업</h2>
        <div className="flex flex-row gap-4">
          <LogoutButton />
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
