"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ConfirmAccountDeletionPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("유효하지 않은 계정 삭제 링크입니다.");
    } else {
      setStatus("loading");
      setMessage("계정 삭제 준비 중...");
    }
  }, [token]);

  const handleConfirmDeletion = async () => {
    if (!token) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/account/confirm-account-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        // Redirect to home page after successful deletion
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch (error) {
      setStatus("error");
      setMessage("계정 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            계정 삭제 확인
          </h2>
        </div>
        <div className="bg-white p-8 rounded-lg border-2 border-gray-300 shadow-lg">
          {status === "loading" && token && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600">
                  계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="mt-4 p-4 bg-red-50 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        삭제될 데이터
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>모든 파일과 웹사이트 데이터</li>
                          <li>계정 정보 및 설정</li>
                          <li>이메일 인증 정보</li>
                          <li>모든 세션 데이터</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.href = "/account"}
                  disabled={isProcessing}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleConfirmDeletion}
                  disabled={isProcessing}
                >
                  {isProcessing ? "삭제 중..." : "계정 삭제"}
                </Button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="22" fill="#10B981" stroke="white" strokeWidth="4"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" stroke="white" d="M14 24l6 6 14-14"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">계정 삭제 완료</h3>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">3초 후 홈페이지로 이동합니다...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="text-red-600">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="22" fill="#EF4444" stroke="white" strokeWidth="4"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" stroke="white" d="M16 16l16 16M32 16L16 32"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">오류 발생</h3>
              <p className="text-gray-600">{message}</p>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/account"}
              >
                계정 페이지로 돌아가기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}