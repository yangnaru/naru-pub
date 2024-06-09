"use server";

import fs from "fs/promises";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import UploadButton from "./UploadButton";
import { CreateDirectoryButton } from "./CreateDirectoryButton";
import path from "path";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateFileButton } from "./CreateFileButton";
import DirectoryBreadcrumb from "./DirectoryBreadcrumb";
import { validateRequest } from "@/lib/auth";
import { getUserHomeDirectory } from "@/lib/server-utils";
import { EDITABLE_FILE_EXTENSIONS } from "@/lib/const";
import { getPublicAssetUrl } from "@/lib/utils";

export default async function DirectoryListing({ paths }: { paths: string[] }) {
  const { user } = await validateRequest();

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  const actualDirectory = path.join(
    await getUserHomeDirectory(user.loginName),
    ...paths
  );
  const files = await fs.readdir(actualDirectory, { withFileTypes: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row justify-between">
        <DirectoryBreadcrumb paths={paths} />

        <div className="flex flex-row justify-between gap-2">
          <div className="flex flex-row gap-2">
            <CreateFileButton baseDirectory={paths.join("/")} />
            <CreateDirectoryButton baseDirectory={paths.join("/")} />
          </div>
          <UploadButton directory={paths.join("/")} />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">종류</TableHead>
            <TableHead>파일(폴더) 이름</TableHead>
            <TableHead className="text-right">삭제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.name}>
              <TableCell>
                {file.isDirectory() ? (
                  <Badge>폴더</Badge>
                ) : (
                  <Badge variant="outline">파일</Badge>
                )}{" "}
              </TableCell>
              <TableCell>
                {EDITABLE_FILE_EXTENSIONS.includes(
                  file.name.split(".").pop() ?? ""
                ) || file.isDirectory() ? (
                  <Link
                    href={`/files/edit/${path.join(
                      paths.join("/"),
                      file.name
                    )}`}
                  >
                    {file.name}
                  </Link>
                ) : (
                  <Link
                    href={getPublicAssetUrl(
                      user.loginName,
                      path.join(paths.join("/"), file.name)
                    )}
                    target="_blank"
                  >
                    {file.name}
                  </Link>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DeleteButton
                  filename={path.join(paths.join("/"), file.name)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
