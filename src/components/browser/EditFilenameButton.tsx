"use client";

import { Button } from "@/components/ui/button";
import { renameFile } from "@/lib/actions/file";
import { toast } from "../ui/use-toast";

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
        toast({
          title: res.message,
          description: `${filename} → ${newFilename}`,
        });
      }}
    >
      이름 변경
    </Button>
  );
}
