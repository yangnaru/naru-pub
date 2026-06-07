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
import CustomDomainsCard from "./CustomDomainsCard";
import { db } from "@/lib/database";
import { getCustomDomainTarget } from "@/lib/customDomains";
import { Settings, User } from "lucide-react";

export default async function AccountPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/");
  }

  const followerRows = await db
    .selectFrom("followers")
    .innerJoin("remote_actors", "remote_actors.id", "followers.remote_actor_id")
    .select([
      "remote_actors.iri as iri",
      "remote_actors.preferred_username as preferred_username",
      "remote_actors.profile_url as profile_url",
    ])
    .where("followers.user_id", "=", user.id)
    .orderBy("followers.id", "desc")
    .limit(200)
    .execute();

  const followers = followerRows.map((row) => {
    let host = "";
    try {
      host = new URL(row.iri).host;
    } catch {
      // fall through
    }
    const handle =
      row.preferred_username && host
        ? `@${row.preferred_username}@${host}`
        : row.iri;
    return {
      handle,
      url: row.profile_url ?? row.iri,
    };
  });
  const fediverseDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "naru.pub";
  const customDomainRows = await db
    .selectFrom("custom_domains")
    .select([
      "id",
      "hostname",
      "cloudflare_status",
      "ssl_status",
      "ownership_verification_name",
      "ownership_verification_type",
      "ownership_verification_value",
      "ssl_validation_records",
      "verification_errors",
      "verified_at",
    ])
    .where("user_id", "=", user.id)
    .orderBy("id", "desc")
    .execute();
  const entitlement = await db
    .selectFrom("users")
    .select("custom_domains_enabled")
    .where("id", "=", user.id)
    .executeTakeFirst();
  const customDomains = customDomainRows.map((domain) => ({
    id: domain.id,
    hostname: domain.hostname,
    cloudflareStatus: domain.cloudflare_status,
    sslStatus: domain.ssl_status,
    ownershipVerificationName: domain.ownership_verification_name,
    ownershipVerificationType: domain.ownership_verification_type,
    ownershipVerificationValue: domain.ownership_verification_value,
    sslValidationRecords: domain.ssl_validation_records,
    verificationErrors: domain.verification_errors,
    verifiedAt: domain.verified_at?.toISOString() ?? null,
  }));

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
        <CustomDomainsCard
          enabled={entitlement?.custom_domains_enabled ?? false}
          domains={customDomains}
          target={getCustomDomainTarget()}
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
