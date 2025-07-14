"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/actions/account";

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

    verifyEmail(token).then((result) => {
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
      setMessage(result.message);
    });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            이메일 인증
          </h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {status === "loading" && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">인증 중입니다...</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h3 className="text-lg font-medium text-green-800 mb-2">
                인증 완료
              </h3>
              <p className="text-green-700 mb-4">{message}</p>
              <a
                href="/account"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                계정 관리로 이동
              </a>
            </div>
          )}
          
          {status === "error" && (
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">✗</div>
              <h3 className="text-lg font-medium text-red-800 mb-2">
                인증 실패
              </h3>
              <p className="text-red-700 mb-4">{message}</p>
              <a
                href="/account"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                계정 관리로 이동
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}