"use client";

import { createFile } from "@/lib/actions/file";
import { Button } from "@/components/ui/button";

export function CreateFileButton({ baseDirectory }: { baseDirectory: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const filename = prompt("파일 이름을 입력해주세요.");

        if (!filename) {
          return;
        }

        createFile(baseDirectory, filename).then((res) => {
          if (res.success) {
            location.reload();
          } else {
            alert(res.message);
          }
        });
      }}
    >
      새 파일
    </Button>
  );
}
