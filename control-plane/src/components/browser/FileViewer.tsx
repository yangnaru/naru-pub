"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { EDITABLE_FILE_EXTENSIONS, IMAGE_FILE_EXTENSIONS, AUDIO_FILE_EXTENSIONS } from "@/lib/const";
import { getPublicAssetUrl } from "@/lib/utils";
import Editor from "@/components/Editor";
import ImageViewer from "./ImageViewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface FileViewerRef {
  save: () => Promise<void>;
}

interface FileViewerProps {
  filePath: string;
  userLoginName: string;
}

const FileViewer = forwardRef<FileViewerRef, FileViewerProps>(function FileViewer({ filePath, userLoginName }, ref) {
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState<string>("");
  
  const fileName = filePath.split('/').pop() || '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const isEditable = EDITABLE_FILE_EXTENSIONS.includes(fileExtension);
  const isImage = IMAGE_FILE_EXTENSIONS.includes(fileExtension);
  const isAudio = AUDIO_FILE_EXTENSIONS.includes(fileExtension);
  
  useEffect(() => {
    if (isEditable) {
      fetchFileContent();
    } else {
      setLoading(false);
    }
  }, [filePath, isEditable]);

  const fetchFileContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('파일을 찾을 수 없습니다');
        }
        throw new Error(`파일을 불러올 수 없습니다: ${response.statusText}`);
      }
      const content = await response.text();
      setFileContent(content);
      setEditorValue(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: filePath, contents: editorValue }),
      });

      const res = await response.json();
      if (res.success) {
        toast.success(`${res.message}: ${filePath}`);
      } else {
        toast.error(`저장 실패: ${res.message}`);
      }
    } catch (error) {
      toast.error(`파일 저장에 실패했습니다: ${filePath}`);
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }), [editorValue, filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">파일을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 mb-2">파일을 불러올 수 없습니다</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Handle different file types
  if (isEditable) {
    return (
      <div className="h-full overflow-auto p-4">
        <Editor
          filename={filePath}
          contents={fileContent}
          showSaveButton={false}
          value={editorValue}
          onChange={setEditorValue}
        />
      </div>
    );
  }

  if (isImage) {
    const imageSrc = getPublicAssetUrl(userLoginName, filePath);
    return (
      <ImageViewer
        src={imageSrc}
        alt={fileName}
        filename={fileName}
      />
    );
  }

  if (isAudio) {
    const audioSrc = getPublicAssetUrl(userLoginName, filePath);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-lg font-medium text-foreground mb-4">{fileName}</h3>
          <audio 
            controls 
            className="w-full mb-4"
            src={audioSrc}
          >
            Your browser does not support the audio element.
          </audio>
          <Button variant="outline" asChild>
            <a href={audioSrc} target="_blank" rel="noopener noreferrer">
              다운로드
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // For other file types, show download option
  const fileUrl = getPublicAssetUrl(userLoginName, filePath);
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-foreground mb-2">{fileName}</h3>
        <p className="text-muted-foreground mb-4">
          이 파일 형식은 미리보기를 지원하지 않습니다
        </p>
        <div className="space-y-2">
          <Button variant="outline" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              새 탭에서 열기
            </a>
          </Button>
          <br />
          <Button variant="outline" asChild>
            <a href={fileUrl} download>
              다운로드
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
});

export default FileViewer;