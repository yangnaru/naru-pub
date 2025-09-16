"use client";

import { Button } from "@/components/ui/button";
import { requestAccountDeletion, deleteAccountImmediately } from "@/lib/actions/account";
import { useState } from "react";
import { Trash2, Loader } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccountButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const result = await requestAccountDeletion();
      
      if (result.success && result.requiresImmediateConfirmation) {
        // User has no verified email - show immediate deletion confirmation
        if (confirm("이메일 인증이 없어 계정이 즉시 삭제됩니다. 모든 파일과 데이터가 영구적으로 삭제됩니다. 정말로 계속하시겠습니까?")) {
          const deleteResult = await deleteAccountImmediately();
          if (deleteResult.success) {
            toast.success(deleteResult.message);
            window.location.href = "/";
          } else {
            toast.error(deleteResult.message);
          }
        }
      } else if (result.success) {
        // User has verified email - email confirmation sent
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("계정 삭제 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      disabled={isLoading}
      onClick={async () => {
        if (confirm("정말로 계정을 삭제하시겠습니까?")) {
          await handleDeleteAccount();
        }
      }}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader size={16} className="animate-spin" />
          처리 중...
        </>
      ) : (
        <>
          <Trash2 size={16} />
          계정 삭제
        </>
      )}
    </Button>
  );
}
