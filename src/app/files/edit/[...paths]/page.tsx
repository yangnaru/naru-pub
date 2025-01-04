import path from "path";
import DirectoryListing from "@/components/browser/DirectoryListing";
import DirectoryBreadcrumb from "@/components/browser/DirectoryBreadcrumb";
import Editor from "@/components/Editor";
import { validateRequest } from "@/lib/auth";
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { getUserHomeDirectory, s3Client } from "@/lib/utils";

export default async function EditPage({
  params,
}: {
  params: { paths: string[] };
}) {
  const { user } = await validateRequest();

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  const decodedPaths = params.paths.map((p) => decodeURIComponent(p));
  const filename = decodedPaths.join("/");
  const actualFilename = path
    .join(getUserHomeDirectory(user.loginName), ...decodedPaths)
    .replaceAll("//", "/");

  const headCommand = new HeadObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: actualFilename,
  });
  try {
    await s3Client.send(headCommand);
  } catch (e) {
    if (e instanceof NotFound) {
      return <DirectoryListing paths={[...decodedPaths, "/"]} />;
    }
    throw e;
  }

  const getCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: actualFilename,
  });
  const get = await s3Client.send(getCommand);

  return (
    <div className="flex flex-col gap-2">
      <DirectoryBreadcrumb paths={decodedPaths} />
      <Editor
        filename={filename}
        contents={(await get.Body?.transformToString()) || ""}
      />
    </div>
  );
}
