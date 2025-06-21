"use client";

import { useActionState } from "react";

import { uploadFile } from "@/lib/actions/file";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState = { message: "" };

export default function UploadButton({ directory }: { directory: string }) {
  const [state, formAction] = useActionState(uploadFile, initialState);

  return (
    <form action={formAction} className="flex flex-row gap-2">
      <Input type="hidden" name="directory" value={directory} />
      <Input id="file" type="file" name="file" multiple />
      <Button type="submit">업로드</Button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
