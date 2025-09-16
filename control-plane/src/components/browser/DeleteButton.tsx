"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeleteButton({ filename }: { filename: string }) {
  return (
    <Button
      variant="destructive"
      onClick={async () => {
        if (!confirm("정말로 삭제하시겠습니까?")) {
          return;
        }

        try {
          const response = await fetch("/api/files/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ filename }),
          });

          const res = await response.json();
          if (res.success) {
            toast.success(`${res.message}: ${filename}`);
            // Refresh the page to update the file list
            window.location.reload();
          } else {
            toast.error(`${res.message}: ${filename}`);
          }
        } catch (error) {
          toast.error(`파일 삭제에 실패했습니다: ${filename}`);
        }
      }}
    >
      삭제
    </Button>
  );
}
