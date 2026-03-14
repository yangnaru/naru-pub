"use client";

import React, { useCallback, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { EDITABLE_FILE_EXTENSION_MAP } from "@/lib/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Editor({
  filename,
  contents,
  showSaveButton = true,
  onlyShowSaveButton = false,
  value: externalValue,
  onChange: externalOnChange,
}: {
  filename: string;
  contents: string;
  showSaveButton?: boolean;
  onlyShowSaveButton?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [internalValue, setInternalValue] = useState(contents);
  const value = externalValue !== undefined ? externalValue : internalValue;
  const setValue = externalOnChange || setInternalValue;
  const onChange = useCallback(
    (val: string | undefined) => {
      setValue(val ?? "");
    },
    [setValue]
  );

  const isDark = resolvedTheme === "dark";
  const ext = filename.split(".").pop() as string;
  const language = EDITABLE_FILE_EXTENSION_MAP[ext] ?? "plaintext";

  const handleSave = async () => {
    try {
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, contents: value }),
      });

      const res = await response.json();
      if (res.success) {
        toast.success(`${res.message}: ${filename}`);
      } else {
        toast.error(`저장 실패: ${res.message}`);
      }
    } catch (error) {
      toast.error(`파일 저장에 실패했습니다: ${filename}`);
    }
  };

  if (onlyShowSaveButton) {
    return (
      <Button
        type="button"
        value="저장"
        onClick={handleSave}
        className="w-full"
      >
        저장
      </Button>
    );
  }

  return (
    <div className={`flex flex-col h-full ${showSaveButton ? 'gap-4' : ''}`}>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          value={value}
          height="100%"
          language={language}
          theme={isDark ? "vs-dark" : "light"}
          onChange={onChange}
          options={{
            minimap: { enabled: true },
            lineNumbers: "on",
            folding: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
          }}
        />
      </div>
      {showSaveButton && (
        <Button
          type="button"
          value="저장"
          onClick={handleSave}
        >
          저장
        </Button>
      )}
    </div>
  );
}
