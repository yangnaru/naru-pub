import { validateRequest } from "@/lib/auth";
import FileExplorer from "@/components/browser/FileExplorer";
import { buildFileTree } from "@/lib/fileUtils";

export default async function File() {
  const { user } = await validateRequest();

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">로그인 필요</h1>
          <p className="text-gray-600">파일 관리를 위해 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const fileTree = await buildFileTree(user.loginName);

  return (
    <div className="w-full p-6">
      <FileExplorer initialFiles={fileTree} userLoginName={user.loginName} />
    </div>
  );
}
