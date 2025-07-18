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
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-8">
        <p>안녕하세요, {user.loginName}님!</p>
        <p>
          나루와 {user.createdAt.getFullYear()}년{" "}
          {user.createdAt.getMonth() + 1}
          월부터 함께해 주셨어요.
        </p>
      </div>

      <EmailManagement 
        currentEmail={user.email} 
        emailVerifiedAt={user.emailVerifiedAt} 
      />
      <DiscoverabilityForm discoverable={user.discoverable} />
      <ChangePasswordForm />

      <div className="flex flex-row gap-4">
        <LogoutButton />
        <DeleteAccountButton />
      </div>
    </div>
  );
}
