import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function DownloadDirectoryButton() {
  return (
    <Button disabled className="flex items-center gap-2">
      <Download size={16} />
      현재 갠홈 다운로드 기능이 점검중입니다.
    </Button>
  );
}
