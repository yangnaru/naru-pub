"use client";

import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/actions/account";

export default function DeleteAccountButton() {
  return (
    <Button
      variant="destructive"
      onClick={async () => {
        if (
          confirm("정말로 계정을 삭제하시겠습니까? 모든 파일이 삭제됩니다.")
        ) {
          await deleteAccount();

          window.location.href = "/";
        }
      }}
    >
      계정 삭제
    </Button>
  );
}
