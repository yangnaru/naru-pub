"use client";

import { useState, useRef } from "react";
import DirectoryTree from "./DirectoryTree";
import FileViewer from "./FileViewer";
import { FileNode } from "@/lib/fileUtils";

interface FileExplorerProps {
  initialFiles: FileNode[];
  userLoginName: string;
}

export default function FileExplorer({ initialFiles, userLoginName }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dragCounterRef = useRef(0);

  const handleFileSelect = (filePath: string, isDirectory: boolean) => {
    if (!isDirectory) {
      setSelectedFile(filePath);
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

  const getCurrentDirectory = () => {
    if (!selectedFile) return "";

    const findNode = (nodes: FileNode[], path: string): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = findNode(node.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedNode = findNode(files, selectedFile);
    if (selectedNode?.isDirectory) {
      return selectedFile;
    } else {
      const parts = selectedFile.split('/');
      parts.pop();
      return parts.join('/');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const targetDirectory = getCurrentDirectory();
      formData.append("directory", targetDirectory ? `${targetDirectory}/` : "");

      droppedFiles.forEach((file) => {
        formData.append("file", file);
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 100);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      clearInterval(progressInterval);

      if (result.success) {
        setUploadProgress(100);
        await handleRefresh();

        // Show success for a moment before hiding
        setTimeout(() => {
          setUploadProgress(0);
          setUploading(false);
        }, 1000);
      } else {
        alert(result.message);
        setUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("파일 업로드에 실패했습니다.");
      setUploading(false);
    }
  };

  return (
    <div
      className="flex h-[calc(100vh-200px)] bg-white border-2 border-gray-300 rounded-lg overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Left Sidebar - Directory Tree */}
      <div className="w-80 border-r border-gray-300 bg-gray-50 overflow-auto">
        <div className="p-3 border-b border-gray-300 bg-gray-100">
          <h3 className="font-medium text-gray-800">📁 파일 탐색기</h3>
        </div>
        <DirectoryTree
          files={files}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          onFileSelect={handleFileSelect}
          onFolderToggle={handleFolderToggle}
          userLoginName={userLoginName}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Right Main Area - File Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-3 border-b border-gray-300 bg-gray-100">
          <h3 className="font-medium text-gray-800 truncate">
            {selectedFile ? `📄 ${selectedFile.split('/').pop()}` : "파일을 선택하세요"}
          </h3>
        </div>
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <FileViewer filePath={selectedFile} userLoginName={userLoginName} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">📂</div>
                <p>왼쪽에서 파일을 선택하여 내용을 확인하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center border-4 border-dashed border-blue-500">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-xl font-semibold text-blue-700">파일을 여기에 드롭하세요</p>
            <p className="text-sm mt-2 text-gray-600">
              {getCurrentDirectory() || "루트 폴더"}에 업로드됩니다
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <div className="text-2xl mb-2">⬆️</div>
            <p className="text-lg font-semibold mb-2">파일 업로드 중...</p>
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}