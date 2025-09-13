"use client";

import React, { useCallback, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EDITABLE_FILE_EXTENSION_MAP } from "@/lib/const";
import { saveFile } from "@/lib/actions/file";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/hooks/use-toast";

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
  const [internalValue, setInternalValue] = useState(contents);
  const value = externalValue !== undefined ? externalValue : internalValue;
  const setValue = externalOnChange || setInternalValue;
  const onChange = useCallback(
    (val: string) => {
      setValue(val);
    },
    [setValue]
  );

  const extensions = [
    EDITABLE_FILE_EXTENSION_MAP[filename.split(".").pop() as string]?.() ??
      javascript(),
  ];

  const handleSave = async () => {
    const res = await saveFile(filename, value);
    if (res.success) {
      toast({
        title: res.message,
        description: filename,
      });
    } else {
      toast({
        title: "저장 실패",
        description: res.message,
      });
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
        <CodeMirror
          value={value}
          height="100%"
          extensions={extensions}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            highlightSelectionMatches: false,
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
