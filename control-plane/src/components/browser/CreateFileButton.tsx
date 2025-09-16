"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateFileButton({ baseDirectory }: { baseDirectory: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const filename = prompt("파일 이름을 입력해주세요.");

        if (!filename) {
          return;
        }

        try {
          const response = await fetch("/api/files/create-file", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ directory: baseDirectory, filename }),
          });

          const res = await response.json();
          if (res.success) {
            toast.success(`${res.message}: ${filename}`);
            window.location.reload();
          } else {
            toast.error(`${res.message}: ${filename}`);
          }
        } catch (error) {
          toast.error(`파일 생성에 실패했습니다: ${filename}`);
        }
      }}
    >
      새 파일
    </Button>
  );
}
