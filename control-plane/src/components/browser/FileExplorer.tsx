"use client";

import { useState, useRef } from "react";
import DirectoryTree from "./DirectoryTree";
import FileViewer, { FileViewerRef } from "./FileViewer";
import { FileNode } from "@/lib/fileUtils";
import { EDITABLE_FILE_EXTENSIONS, IMAGE_FILE_EXTENSIONS, AUDIO_FILE_EXTENSIONS } from "@/lib/const";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FileExplorerProps {
  initialFiles: FileNode[];
  userLoginName: string;
}

function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) return "📁";

  const extension = fileName.split('.').pop()?.toLowerCase() || "";

  if (EDITABLE_FILE_EXTENSIONS.includes(extension)) {
    switch (extension) {
      case "html":
      case "htm":
        return "🌐";
      case "css":
        return "🎨";
      case "js":
        return "⚡";
      case "json":
        return "📋";
      case "md":
      case "markdown":
        return "📝";
      default:
        return "📄";
    }
  }

  if (IMAGE_FILE_EXTENSIONS.includes(extension)) {
    return "🖼️";
  }

  if (AUDIO_FILE_EXTENSIONS.includes(extension)) {
    return "🎵";
  }

  return "📄";
}

export default function FileExplorer({ initialFiles, userLoginName }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const dragCounterRef = useRef(0);
  const fileViewerRef = useRef<FileViewerRef>(null);

  const handleFileSelect = (filePath: string, isDirectory: boolean) => {
    if (isDirectory) {
      // When a directory is clicked, set it as the current working directory
      setSelectedFile(filePath);
    } else {
      // For files, set as selected file
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
        toast.error(result.message);
        setUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("파일 업로드에 실패했습니다.");
      setUploading(false);
    }
  };

  const handleStartRename = () => {
    if (!selectedFile) return;

    // Check if selected item is a file (not directory)
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
      return; // Don't allow renaming directories for now
    }

    const filename = selectedFile.split('/').pop() || "";
    // Extract filename without extension for editing
    const lastDotIndex = filename.lastIndexOf('.');
    const filenameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

    setNewFileName(filenameWithoutExt);
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewFileName("");
  };

  const handleConfirmRename = async () => {
    if (!selectedFile || !newFileName.trim()) {
      handleCancelRename();
      return;
    }

    try {
      const originalFilename = selectedFile.split('/').pop() || "";
      const lastDotIndex = originalFilename.lastIndexOf('.');
      const extension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex) : "";

      // Combine new filename with original extension
      const finalFilename = newFileName.trim() + extension;

      // Check if the new filename is the same as the original
      if (finalFilename === originalFilename) {
        handleCancelRename();
        return;
      }

      // Check if a file with the new name already exists
      const pathParts = selectedFile.split('/');
      pathParts[pathParts.length - 1] = finalFilename;
      const newPath = pathParts.join('/');

      const checkExisting = (nodes: FileNode[], targetPath: string): boolean => {
        for (const node of nodes) {
          if (node.path === targetPath) {
            return true;
          }
          if (node.children) {
            if (checkExisting(node.children, targetPath)) {
              return true;
            }
          }
        }
        return false;
      };

      if (checkExisting(files, newPath)) {
        const confirmOverwrite = confirm(
          `"${finalFilename}" 파일이 이미 존재합니다.\n기존 파일을 덮어쓰시겠습니까?`
        );
        if (!confirmOverwrite) {
          return; // Don't proceed with rename
        }
      }

      const response = await fetch("/api/files/rename", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldFilename: selectedFile,
          newFilename: finalFilename,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update selected file to new path
        setSelectedFile(newPath);
        await handleRefresh();
        handleCancelRename();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("파일 이름 변경에 실패했습니다.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirmRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  return (
    <div
      className="flex h-full bg-card overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 p-3 border-b border-border bg-secondary">
          {selectedFile ? (
            <div className="flex items-center justify-between">
              {isRenaming ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span>{getFileIcon(selectedFile.split('/').pop() || "", false)}</span>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="px-2 py-1 text-sm border border-primary rounded-l focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    {(() => {
                      const originalFilename = selectedFile?.split('/').pop() || "";
                      const lastDotIndex = originalFilename.lastIndexOf('.');
                      const extension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex) : "";
                      return extension ? (
                        <span className="px-2 py-1 text-sm bg-secondary border border-l-0 border-r-0 border-primary text-muted-foreground">
                          {extension}
                        </span>
                      ) : null;
                    })()}
                    <button
                      onClick={handleConfirmRename}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
                      title="저장 (Enter)"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded-r hover:bg-red-200 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
                      title="취소 (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 flex-1">
                    {(() => {
                      // Check if selected item is a directory
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
                      const isDirectory = selectedNode?.isDirectory;

                      if (isDirectory) {
                        return (
                          <h3 className="font-medium text-foreground truncate">
                            {getFileIcon(selectedFile.split('/').pop() || "", true)} {selectedFile.split('/').pop() || "루트"} (작업 폴더)
                          </h3>
                        );
                      } else {
                        return (
                          <h3
                            className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={handleStartRename}
                            title="클릭하여 이름 변경"
                          >
                            {getFileIcon(selectedFile.split('/').pop() || "", false)} {selectedFile.split('/').pop()}
                          </h3>
                        );
                      }
                    })()}
                  </div>
                  <Button size="sm" onClick={() => fileViewerRef.current?.save()}>
                    저장
                  </Button>
                </>
              )}
            </div>
          ) : (
            <h3 className="font-medium text-foreground">파일을 선택하세요</h3>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {selectedFile ? (
            (() => {
              // Check if selected item is a directory
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
                return (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📁</div>
                      <p className="text-lg font-medium mb-2">현재 작업 폴더: {selectedFile || "루트"}</p>
                      <p>이 폴더에서 파일을 생성하거나 업로드할 수 있습니다</p>
                    </div>
                  </div>
                );
              } else {
                return <FileViewer ref={fileViewerRef} filePath={selectedFile} userLoginName={userLoginName} />;
              }
            })()
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

      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg border-2 border-border shadow-lg text-center border-4 border-dashed border-primary">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-xl font-semibold text-primary">파일을 여기에 드롭하세요</p>
            <p className="text-sm mt-2 text-muted-foreground">
              {getCurrentDirectory() || "루트 폴더"}에 업로드됩니다
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg border-2 border-border shadow-lg text-center">
            <div className="text-2xl mb-2">⬆️</div>
            <p className="text-lg font-semibold mb-2">파일 업로드 중...</p>
            <div className="w-64 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}