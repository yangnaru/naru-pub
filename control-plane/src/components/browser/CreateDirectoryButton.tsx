"use client";

import { createDirectory } from "@/lib/actions/file";
import path from "path";
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

        const res = await createDirectory(
          path.join(baseDirectory, newDirectory)
        );
        if (res.success) {
          toast.success(`${res.message}: ${newDirectory}`);
        } else {
          toast.error(`${res.message}: ${newDirectory}`);
        }
      }}
    >
      새 폴더
    </Button>
  );
}
