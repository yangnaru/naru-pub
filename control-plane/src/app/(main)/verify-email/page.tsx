"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("유효하지 않은 인증 링크입니다.");
      return;
    }

    // Call the verify email API
    fetch("/api/account/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setStatus("success");
          setMessage(result.message);
        } else {
          setStatus("error");
          setMessage(result.message);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("이메일 인증 중 오류가 발생했습니다.");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6">
        <div className="bg-card border-2 border-border shadow-lg rounded-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              이메일 인증
            </h1>
          </div>

          {status === "loading" && (
            <div className="text-center">
              <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">인증 중입니다...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
                인증 완료
              </h2>
              <p className="text-green-600 dark:text-green-500 mb-6">{message}</p>
              <Button asChild className="w-full">
                <a href="/account">
                  계정 관리로 이동
                </a>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
                인증 실패
              </h2>
              <p className="text-red-600 dark:text-red-500 mb-6">{message}</p>
              <Button variant="outline" asChild className="w-full">
                <a href="/account">
                  계정 관리로 이동
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}