"use client";

import { useState, useRef } from "react";
import DirectoryTree from "./DirectoryTree";
import FileViewer, { FileViewerRef } from "./FileViewer";
import { FileNode } from "@/lib/fileUtils";
import { Button } from "@/components/ui/button";

interface FileExplorerWithSelectedProps {
  initialFiles: FileNode[];
  userLoginName: string;
  initialSelectedFile: string | null;
}

export default function FileExplorerWithSelected({ 
  initialFiles, 
  userLoginName, 
  initialSelectedFile 
}: FileExplorerWithSelectedProps) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialSelectedFile);
  const fileViewerRef = useRef<FileViewerRef>(null);

  // Build expanded folders set based on the initially selected file
  const buildInitialExpandedFolders = (selectedFilePath: string | null): Set<string> => {
    const expanded = new Set<string>([""]); // Always expand root
    
    if (selectedFilePath) {
      const parts = selectedFilePath.split('/');
      let currentPath = "";
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        expanded.add(currentPath);
      }
    }
    
    return expanded;
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    buildInitialExpandedFolders(initialSelectedFile)
  );

  const handleFileSelect = (filePath: string, isDirectory: boolean) => {
    if (!isDirectory) {
      setSelectedFile(filePath);
      // Update URL without page reload
      const newUrl = `/files/edit/${filePath}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleFolderToggle = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleRefresh = async () => {
    try {
      const response = await fetch("/api/files/tree");
      const result = await response.json();
      
      if (result.success) {
        setFiles(result.files);
      } else {
        console.error("Failed to refresh files:", result.message);
      }
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-card border-2 border-border shadow-lg rounded-lg overflow-hidden">
      {/* Left Sidebar - Directory Tree */}
      <div className="w-80 border-r border-border bg-muted overflow-auto">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="font-medium text-foreground">📁 파일 탐색기</h3>
        </div>
        <DirectoryTree
          files={files}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          onFileSelect={handleFileSelect}
          onFolderToggle={handleFolderToggle}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Right Main Area - File Viewer */}
      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 z-10 p-3 border-b border-border bg-secondary flex items-center justify-between">
          <h3 className="font-medium text-foreground">
            {selectedFile ? `📄 ${selectedFile.split('/').pop()}` : "파일을 선택하세요"}
          </h3>
          {selectedFile && (
            <Button size="sm" onClick={() => fileViewerRef.current?.save()}>
              저장
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <FileViewer ref={fileViewerRef} filePath={selectedFile} userLoginName={userLoginName} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-6xl mb-4">📂</div>
                <p>왼쪽에서 파일을 선택하여 내용을 확인하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}