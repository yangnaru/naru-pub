"use client";

import { useState, useEffect, useRef } from "react";
import { EDITABLE_FILE_EXTENSIONS, IMAGE_FILE_EXTENSIONS, AUDIO_FILE_EXTENSIONS } from "@/lib/const";
import { FileNode } from "@/lib/fileUtils";
import { Button } from "@/components/ui/button";

interface DirectoryTreeProps {
  files: FileNode[];
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onFileSelect: (filePath: string, isDirectory: boolean) => void;
  onFolderToggle: (folderPath: string) => void;
  userLoginName: string;
  onRefresh: () => void;
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

function TreeNode({ 
  node, 
  level = 0, 
  selectedFile, 
  expandedFolders, 
  onFileSelect, 
  onFolderToggle,
  onDelete,
  flashingItems
}: {
  node: FileNode;
  level?: number;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onFileSelect: (filePath: string, isDirectory: boolean) => void;
  onFolderToggle: (folderPath: string) => void;
  onDelete: (filePath: string) => void;
  flashingItems: Set<string>;
}) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  const isFlashing = flashingItems.has(node.path);
  
  const handleClick = () => {
    if (node.isDirectory) {
      onFolderToggle(node.path);
    } else {
      onFileSelect(node.path, false);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDelete = () => {
    if (confirm(`정말로 "${node.name}"을(를) 삭제하시겠습니까?`)) {
      onDelete(node.path);
    }
    setShowContextMenu(false);
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-200 text-sm transition-all duration-300 ${
          isSelected ? "bg-blue-100 border-l-4 border-blue-600 font-medium" : ""
        } ${isFlashing ? "bg-green-100 animate-pulse" : ""}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {node.isDirectory && (
          <span className="mr-1 text-xs">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
        <span className="mr-2">{getFileIcon(node.name, node.isDirectory)}</span>
        <span className="text-sm text-gray-800 truncate">{node.name}</span>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowContextMenu(false)}
          />
          <div 
            className="fixed z-20 bg-white border border-gray-300 rounded shadow-md py-1"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 text-red-600"
              onClick={handleDelete}
            >
              🗑️ 삭제
            </button>
          </div>
        </>
      )}
      
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onFileSelect={onFileSelect}
              onFolderToggle={onFolderToggle}
              onDelete={onDelete}
              flashingItems={flashingItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryTree({
  files,
  selectedFile,
  expandedFolders,
  onFileSelect,
  onFolderToggle,
  userLoginName,
  onRefresh,
}: DirectoryTreeProps) {
  const [uploading, setUploading] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showNewDirectoryInput, setShowNewDirectoryInput] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [flashingItems, setFlashingItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current directory based on selected file/folder
  const getCurrentDirectory = () => {
    if (!selectedFile) return "";
    
    // If selected item is a directory, use it as current directory
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
      // If selected item is a file, use its parent directory
      const parts = selectedFile.split('/');
      parts.pop(); // Remove file name
      return parts.join('/');
    }
  };

  const targetDirectory = getCurrentDirectory();

  // Flash effect for new items
  const flashItem = (itemPath: string) => {
    setFlashingItems(prev => new Set(prev.add(itemPath)));
    setTimeout(() => {
      setFlashingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemPath);
        return newSet;
      });
    }, 2000); // Flash for 2 seconds
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("directory", targetDirectory ? `${targetDirectory}/` : "");
      
      for (let i = 0; i < files.length; i++) {
        formData.append("file", files[i]);
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        onRefresh();
        // Flash uploaded files
        for (let i = 0; i < files.length; i++) {
          const filePath = targetDirectory ? `${targetDirectory}/${files[i].name}` : files[i].name;
          flashItem(filePath);
        }
      } else {
        alert(result.message); // Keep alerts for errors
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateDirectory = async () => {
    if (!newDirectoryName.trim()) return;

    try {
      const response = await fetch("/api/files/create-directory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directory: targetDirectory ? `${targetDirectory}/${newDirectoryName}` : newDirectoryName,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const newDirPath = targetDirectory ? `${targetDirectory}/${newDirectoryName}` : newDirectoryName;
        setNewDirectoryName("");
        setShowNewDirectoryInput(false);
        onRefresh();
        flashItem(newDirPath);
      } else {
        alert(result.message); // Keep alerts for errors
      }
    } catch (error) {
      console.error("Create directory error:", error);
      alert("디렉토리 생성에 실패했습니다.");
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    try {
      const response = await fetch("/api/files/create-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directory: targetDirectory,
          filename: newFileName,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const newFilePath = targetDirectory ? `${targetDirectory}/${newFileName}` : newFileName;
        setNewFileName("");
        setShowNewFileInput(false);
        onRefresh();
        flashItem(newFilePath);
      } else {
        alert(result.message); // Keep alerts for errors
      }
    } catch (error) {
      console.error("Create file error:", error);
      alert("파일 생성에 실패했습니다.");
    }
  };

  const handleDelete = async (filePath: string) => {
    try {
      const response = await fetch("/api/files/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: filePath,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onRefresh();
        // If deleted file was selected, clear selection
        if (selectedFile === filePath) {
          onFileSelect("", false);
        }
      } else {
        alert(result.message); // Keep alerts for errors
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-300 bg-gray-100">
        <div className="space-y-2">
          <div className="text-xs text-gray-600 mb-1">
            현재 위치: {targetDirectory || "루트"}
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs"
            >
              {uploading ? "업로드중..." : "📁 업로드"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewDirectoryInput(!showNewDirectoryInput)}
              className="text-xs"
            >
              📂 폴더
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewFileInput(!showNewFileInput)}
              className="text-xs"
            >
              📄 파일
            </Button>
          </div>

          {showNewDirectoryInput && (
            <div className="flex space-x-1">
              <input
                type="text"
                value={newDirectoryName}
                onChange={(e) => setNewDirectoryName(e.target.value)}
                placeholder="폴더 이름"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                onKeyPress={(e) => e.key === "Enter" && handleCreateDirectory()}
              />
              <Button size="sm" onClick={handleCreateDirectory} className="text-xs">
                생성
              </Button>
            </div>
          )}

          {showNewFileInput && (
            <div className="flex space-x-1">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="파일 이름 (예: test.html)"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                onKeyPress={(e) => e.key === "Enter" && handleCreateFile()}
              />
              <Button size="sm" onClick={handleCreateFile} className="text-xs">
                생성
              </Button>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          multiple
          className="hidden"
        />
      </div>

      {/* File Tree */}
      <div className="p-2">
        {files.map((file) => (
          <TreeNode
            key={file.path}
            node={file}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onFileSelect={onFileSelect}
            onFolderToggle={onFolderToggle}
            onDelete={handleDelete}
            flashingItems={flashingItems}
          />
        ))}
        
        {files.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📂</div>
            <p className="text-sm">파일이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}