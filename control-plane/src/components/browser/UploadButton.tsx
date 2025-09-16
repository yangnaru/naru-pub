"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UploadButton({ directory }: { directory: string }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData(e.currentTarget);
    const files = formData.getAll("file") as File[];

    if (files.length === 0) {
      toast.error("파일을 선택해주세요.");
      setIsUploading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("directory", directory);
      files.forEach(file => uploadFormData.append("file", file));

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const res = await response.json();
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("파일 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-row gap-2">
      <Input id="file" type="file" name="file" multiple disabled={isUploading} />
      <Button type="submit" disabled={isUploading}>
        {isUploading ? "업로드 중..." : "업로드"}
      </Button>
    </form>
  );
}
