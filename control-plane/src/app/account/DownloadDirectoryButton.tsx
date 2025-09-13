"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

export default function DownloadDirectoryButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/user/download-directory");
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "갠홈 다운로드 중 오류가 발생했습니다.");
        return;
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "directory.zip";

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Download error:", error);
      alert("갠홈 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-2"
    >
      <Download size={16} />
      {isDownloading ? "다운로드 중..." : "갠홈 다운로드"}
    </Button>
  );
}