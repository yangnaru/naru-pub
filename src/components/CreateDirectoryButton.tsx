"use client";

import { createDirectory } from "@/lib/actions/file";
import path from "path";
import { Button } from "@/components/ui/button";

export function CreateDirectoryButton({
  baseDirectory,
}: {
  baseDirectory: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const newDirectory = prompt("폴더 이름을 입력해주세요.");

        if (!newDirectory) {
          return;
        }

        createDirectory(path.join(baseDirectory, newDirectory)).then((res) => {
          if (res.success) {
            location.reload();
          } else {
            alert(res.message);
          }
        });
      }}
    >
      새 폴더
    </Button>
  );
}
