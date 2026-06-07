import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getUserEntitlement, userHasFeature } from "@/lib/entitlements";
import SupportCard from "./SupportCard";
import { ReceiptText, Settings, User } from "lucide-react";

// Limited rollout: only these users see the 나루 후원 (donation) section while
// Toss Payments review is in progress.
const SUPPORT_VISIBLE_USERS = new Set(["yang", "tosspayments"]);

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
  const entitlement = await getUserEntitlement(user.id);
  const customDomainsEnabled = await userHasFeature(user.id, "custom_domains");
  const subscriptionRow = await db
    .selectFrom("subscriptions")
    .select(["status", "billing_interval", "next_billing_at"])
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  const subscription = subscriptionRow
    ? {
        status: subscriptionRow.status,
        billingInterval: subscriptionRow.billing_interval,
        nextBillingAt: subscriptionRow.next_billing_at
          ? new Date(subscriptionRow.next_billing_at).toISOString()
          : null,
      }
    : null;
  const customDomainRows = customDomainsEnabled
    ? await db
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
        .execute()
    : [];
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
        {SUPPORT_VISIBLE_USERS.has(user.loginName) && (
          <div className="space-y-3">
            <SupportCard
              clientKey={process.env.TOSS_CLIENT_KEY ?? ""}
              comp={entitlement.comp}
              supporterUntil={
                entitlement.supporterUntil
                  ? entitlement.supporterUntil.toISOString()
                  : null
              }
              subscription={subscription}
            />
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href="/account/payments">
                  <ReceiptText size={16} />
                  결제 내역 보기
                </Link>
              </Button>
            </div>
          </div>
        )}
        {customDomainsEnabled && (
          <CustomDomainsCard
            enabled={customDomainsEnabled}
            domains={customDomains}
            target={getCustomDomainTarget()}
          />
        )}
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
              <DownloadDirectoryButton
                hasVerifiedEmail={!!user.email && !!user.emailVerifiedAt}
              />
              <LogoutButton />
              <DeleteAccountButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
