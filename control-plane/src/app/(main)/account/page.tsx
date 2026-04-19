import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "./LogoutButton";
import DeleteAccountButton from "./DeleteAccountButton";
import DownloadDirectoryButton from "./DownloadDirectoryButton";
import { DiscoverabilityForm } from "./DiscoverabilityForm";
import ChangePasswordForm from "./ChangePasswordForm";
import EmailManagement from "./EmailManagement";
import FediverseCard from "./FediverseCard";
import { db } from "@/lib/database";
import { Settings, User } from "lucide-react";

export default async function AccountPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/");
  }

  const followerRows = await db
    .selectFrom("followers")
    .select("actor_iri")
    .where("user_id", "=", user.id)
    .orderBy("id", "desc")
    .limit(200)
    .execute();

  const followers = followerRows.map((row) => {
    try {
      const url = new URL(row.actor_iri);
      const segments = url.pathname.split("/").filter(Boolean);
      const username = segments[segments.length - 1] ?? url.host;
      return {
        handle: `@${username}@${url.host}`,
        url: row.actor_iri,
      };
    } catch {
      return { handle: row.actor_iri, url: row.actor_iri };
    }
  });
  const fediverseDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "naru.pub";

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="bg-secondary border-b-2 border-border">
            <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
              <User size={20} /> 계정 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-background border border-border rounded p-3">
              <p className="text-muted-foreground text-base leading-relaxed mb-2">
                안녕하세요,{" "}
                <strong className="text-primary">{user.loginName}</strong>님!
              </p>
              <p className="text-muted-foreground text-base leading-relaxed">
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
        <FediverseCard
          loginName={user.loginName}
          domain={fediverseDomain}
          followers={followers}
        />
        <DiscoverabilityForm discoverable={user.discoverable} />
        <ChangePasswordForm />

        <Card className="bg-card border-2 border-border shadow-lg">
          <CardHeader className="bg-secondary border-b-2 border-border">
            <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
              <Settings size={20} /> 계정 작업
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-row gap-4 flex-wrap">
              <DownloadDirectoryButton hasVerifiedEmail={!!user.email && !!user.emailVerifiedAt} />
              <LogoutButton />
              <DeleteAccountButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
