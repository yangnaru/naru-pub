"use client";

import { Button } from "@/components/ui/button";
import { renameFile } from "@/lib/actions/file";

export default function DeleteButton({ filename }: { filename: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const newFilename = prompt("새로운 파일 이름을 입력하세요.");
        if (!newFilename) {
          return;
        }

        const res = await renameFile(filename, newFilename);
        alert(res.message);
      }}
    >
      이름 변경
    </Button>
  );
}
