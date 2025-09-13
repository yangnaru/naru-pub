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

export default async function EditPage(
  props: {
    params: Promise<{ paths: string[] }>;
  }
) {
  const params = await props.params;
  const { user } = await validateRequest();

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white border-2 border-gray-300  rounded-lg p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">로그인 필요</h1>
          <p className="text-gray-600">파일 편집을 위해 로그인이 필요합니다.</p>
        </div>
      </div>
    );
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
      return (
        <div className="max-w-6xl mx-auto p-6">
          <DirectoryListing paths={[...decodedPaths, "/"]} />
        </div>
      );
    }
    throw e;
  }

  const getCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: actualFilename,
  });
  const get = await s3Client.send(getCommand);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col gap-2">
        <DirectoryBreadcrumb paths={decodedPaths} />
        <Editor
          filename={filename}
          contents={(await get.Body?.transformToString()) || ""}
        />
      </div>
    </div>
  );
}
