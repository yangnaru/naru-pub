import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import { DiscoverabilityForm } from "./DiscoverabilityForm";
import ChangePasswordForm from "./ChangePasswordForm";
import { getCurrentSession } from "@/lib/auth";

export default async function AccountPage() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-8">
        <p>안녕하세요, {user.loginName}님!</p>
        <p>
          나루와 {new Date(user.createdAt).getFullYear()}년{" "}
          {new Date(user.createdAt).getMonth() + 1}
          월부터 함께해 주셨어요.
        </p>
      </div>

      <DiscoverabilityForm
        discoverable={user.discoverable === 0 ? false : true}
      />
      <ChangePasswordForm />

      <div className="flex flex-row gap-4">
        <LogoutButton />
        <DeleteAccountButton />
      </div>
    </div>
  );
}
