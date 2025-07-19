"use client";

import { Button } from "@/components/ui/button";
import { requestAccountDeletion } from "@/lib/actions/account";
import { useState } from "react";

export default function DeleteAccountButton() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="destructive"
      disabled={isLoading}
      onClick={async () => {
        if (
          confirm("정말로 계정을 삭제하시겠습니까? 확인 이메일을 발송합니다.")
        ) {
          setIsLoading(true);
          try {
            const result = await requestAccountDeletion();
            if (result.success) {
              alert(result.message);
            } else {
              alert(result.message);
            }
          } catch (error) {
            alert("계정 삭제 요청 중 오류가 발생했습니다.");
          } finally {
            setIsLoading(false);
          }
        }
      }}
    >
      {isLoading ? "처리 중..." : "계정 삭제"}
    </Button>
  );
}
