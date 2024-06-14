"use client";

import { Button } from "@/components/ui/button";
import { deleteFile } from "@/lib/actions/file";
import { toast } from "../ui/use-toast";

export default function DeleteButton({ filename }: { filename: string }) {
  return (
    <Button
      variant="destructive"
      onClick={async () => {
        if (!confirm("정말로 삭제하시겠습니까?")) {
          return;
        }

        const res = await deleteFile(filename);
        toast({ title: res.message, description: filename });
      }}
    >
      삭제
    </Button>
  );
}
