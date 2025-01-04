"use client";

import React, { useCallback, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EDITABLE_FILE_EXTENSION_MAP } from "@/lib/const";
import { saveFile } from "@/lib/actions/file";
import { Button } from "@/components/ui/button";
import { toast } from "./ui/use-toast";

export default function Editor({
  filename,
  contents,
}: {
  filename: string;
  contents: string;
}) {
  const [value, setValue] = useState(contents);
  const onChange = useCallback(
    (val: React.SetStateAction<string>, viewUpdate: any) => {
      setValue(val);
    },
    []
  );

  const extensions = [
    EDITABLE_FILE_EXTENSION_MAP[filename.split(".").pop() as string]?.() ??
      javascript(),
  ];

  return (
    <div className="flex flex-col gap-4">
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        onChange={onChange}
      />
      <Button
        type="button"
        value="저장"
        onClick={async () => {
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
        }}
      >
        저장
      </Button>
    </div>
  );
}
