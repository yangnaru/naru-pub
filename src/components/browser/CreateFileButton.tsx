"use client";

import { createFile } from "@/lib/actions/file";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/hooks/use-toast";

export function CreateFileButton({ baseDirectory }: { baseDirectory: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const filename = prompt("파일 이름을 입력해주세요.");

        if (!filename) {
          return;
        }

        const res = await createFile(baseDirectory, filename);

        if (res?.success) {
          toast({ title: res.message, description: filename });
        }
      }}
    >
      새 파일
    </Button>
  );
}
