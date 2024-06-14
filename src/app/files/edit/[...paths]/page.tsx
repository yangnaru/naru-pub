import path from "path";
import fs from "fs";
import DirectoryListing from "@/components/browser/DirectoryListing";
import DirectoryBreadcrumb from "@/components/browser/DirectoryBreadcrumb";
import Editor from "@/components/Editor";
import { validateRequest } from "@/lib/auth";

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
  const actualFilename = path.join(
    process.env.USER_HOME_DIRECTORY!,
    user.loginName,
    filename
  );

  if (!fs.existsSync(actualFilename)) {
    return (
      <div>
        <h1>{filename}</h1>

        <h1>파일을 찾을 수 없습니다.</h1>
      </div>
    );
  }

  const file = fs.statSync(actualFilename);

  if (file.isDirectory()) {
    return <DirectoryListing paths={decodedPaths} />;
  }

  const contents = fs.readFileSync(actualFilename, "utf-8");

  return (
    <div className="flex flex-col gap-2">
      <DirectoryBreadcrumb paths={decodedPaths} />
      <Editor filename={filename} contents={contents} />
    </div>
  );
}
