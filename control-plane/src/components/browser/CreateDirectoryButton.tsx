"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CreateDirectoryButton({
  baseDirectory,
}: {
  baseDirectory: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const newDirectory = prompt("폴더 이름을 입력해주세요.");

        if (!newDirectory) {
          return;
        }

        try {
          const directoryPath = `${baseDirectory}/${newDirectory}`.replaceAll("//", "/");
          const response = await fetch("/api/files/create-directory", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ directory: directoryPath }),
          });

          const res = await response.json();
          if (res.success) {
            toast.success(`${res.message}: ${newDirectory}`);
            window.location.reload();
          } else {
            toast.error(`${res.message}: ${newDirectory}`);
          }
        } catch (error) {
          toast.error(`폴더 생성에 실패했습니다: ${newDirectory}`);
        }
      }}
    >
      새 폴더
    </Button>
  );
}
