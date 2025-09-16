"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeleteButton({ filename }: { filename: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const newFilename = prompt("새로운 파일 이름을 입력하세요.");
        if (!newFilename) {
          return;
        }

        try {
          const response = await fetch("/api/files/rename", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ oldFilename: filename, newFilename }),
          });

          const res = await response.json();
          if (res.success) {
            toast.success(`${res.message}: ${filename} → ${newFilename}`);
            window.location.reload();
          } else {
            toast.error(`${res.message}: ${filename} → ${newFilename}`);
          }
        } catch (error) {
          toast.error(`파일 이름 변경에 실패했습니다: ${filename} → ${newFilename}`);
        }
      }}
    >
      이름 변경
    </Button>
  );
}
