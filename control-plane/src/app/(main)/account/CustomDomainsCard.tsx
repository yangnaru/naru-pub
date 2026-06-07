"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Globe2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CustomDomain = {
  id: number;
  hostname: string;
  cloudflareStatus: string;
  sslStatus: string | null;
  ownershipVerificationName: string | null;
  ownershipVerificationType: string | null;
  ownershipVerificationValue: string | null;
  sslValidationRecords: unknown;
  verificationErrors: unknown;
  verifiedAt: string | null;
};

type SslValidationRecord = {
  status?: string;
  txt_name?: string;
  txt_value?: string;
  cname?: string;
  cname_target?: string;
  http_url?: string;
  http_body?: string;
};

function getSslValidationRecords(value: unknown): SslValidationRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((record): record is SslValidationRecord => {
    return typeof record === "object" && record !== null;
  });
}

function getVerificationErrors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((error): error is string => typeof error === "string");
}

export default function CustomDomainsCard({
  enabled,
  domains,
  target,
}: {
  enabled: boolean;
  domains: CustomDomain[];
  target: string;
}) {
  const [hostname, setHostname] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function submitDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingId(0);

    try {
      const response = await fetch("/api/account/custom-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setHostname("");
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("도메인 추가 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  async function refreshDomain(id: number) {
    setPendingId(id);

    try {
      const response = await fetch("/api/account/custom-domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("도메인 상태 확인 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteDomain(id: number) {
    setPendingId(id);

    try {
      const response = await fetch("/api/account/custom-domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("도메인 삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="bg-card border-2 border-border shadow-lg">
      <CardHeader className="bg-secondary border-b-2 border-border">
        <CardTitle className="text-foreground text-xl font-bold flex items-center gap-2">
          <Globe2 size={20} />
          커스텀 도메인
          {!enabled && <Badge variant="secondary">유료</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {!enabled ? (
          <div className="bg-muted border border-border rounded p-3 text-sm text-muted-foreground">
            커스텀 도메인은 유료 계정에서 사용할 수 있습니다.
          </div>
        ) : (
          <>
            <div className="bg-muted border border-border rounded p-3 text-sm text-muted-foreground space-y-2">
              <p>
                아래에 도메인을 추가하면 Cloudflare for SaaS가 나루 프록시로
                연결합니다.
              </p>
              <p>
                도메인을 추가하면 항목별로 필요한 DNS 레코드가 표시됩니다.
                CNAME(또는 ALIAS/ANAME) 대상을{" "}
                <strong className="text-foreground">{target}</strong>로 설정하고,
                함께 안내되는 소유권·SSL 인증 레코드를 DNS에 등록한 뒤 상태 확인
                버튼을 눌러주세요.
              </p>
            </div>

            <form
              onSubmit={submitDomain}
              className="flex flex-col sm:flex-row gap-2"
            >
              <Input
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
                placeholder="example.com"
                disabled={pendingId !== null}
              />
              <Button
                type="submit"
                disabled={pendingId !== null || hostname.trim() === ""}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                추가
              </Button>
            </form>

            <div className="space-y-3">
              {domains.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  등록된 커스텀 도메인이 없습니다.
                </p>
              ) : (
                domains.map((domain) => {
                  const sslValidationRecords = getSslValidationRecords(
                    domain.sslValidationRecords
                  );
                  const verificationErrors = getVerificationErrors(
                    domain.verificationErrors
                  );

                  return (
                    <div
                      key={domain.id}
                      className="border border-border rounded p-3 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground break-all">
                            {domain.hostname}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            호스트: {domain.cloudflareStatus}
                            {domain.sslStatus
                              ? ` / SSL: ${domain.sslStatus}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refreshDomain(domain.id)}
                            disabled={pendingId !== null}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw size={14} />
                            상태 확인
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDomain(domain.id)}
                            disabled={pendingId !== null}
                            className="flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            삭제
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="bg-background border border-border rounded p-2">
                          <span className="text-muted-foreground">
                            연결 대상
                          </span>
                          <p className="font-mono break-all">{target}</p>
                        </div>
                        {domain.ownershipVerificationName &&
                          domain.ownershipVerificationValue && (
                            <div className="bg-background border border-border rounded p-2">
                              <span className="text-muted-foreground">
                                소유권 {domain.ownershipVerificationType ?? "TXT"}
                              </span>
                              <p className="font-mono break-all">
                                {domain.ownershipVerificationName}
                              </p>
                              <p className="font-mono break-all">
                                {domain.ownershipVerificationValue}
                              </p>
                            </div>
                          )}
                        {sslValidationRecords.map((record, index) => (
                          <div
                            key={`${domain.id}-${index}`}
                            className="bg-background border border-border rounded p-2"
                          >
                            <span className="text-muted-foreground">
                              인증서 검증 {record.status ? `(${record.status})` : ""}
                            </span>
                            {record.txt_name && record.txt_value && (
                              <>
                                <p className="font-mono break-all">
                                  {record.txt_name}
                                </p>
                                <p className="font-mono break-all">
                                  {record.txt_value}
                                </p>
                              </>
                            )}
                            {record.cname && record.cname_target && (
                              <>
                                <p className="font-mono break-all">
                                  {record.cname}
                                </p>
                                <p className="font-mono break-all">
                                  {record.cname_target}
                                </p>
                              </>
                            )}
                            {record.http_url && record.http_body && (
                              <>
                                <p className="font-mono break-all">
                                  {record.http_url}
                                </p>
                                <p className="font-mono break-all">
                                  {record.http_body}
                                </p>
                              </>
                            )}
                          </div>
                        ))}
                        {verificationErrors.length > 0 && (
                          <div className="bg-background border border-border rounded p-2">
                            <span className="text-muted-foreground">
                              Cloudflare 오류
                            </span>
                            {verificationErrors.map((error, index) => (
                              <p key={index} className="break-words">
                                {error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
