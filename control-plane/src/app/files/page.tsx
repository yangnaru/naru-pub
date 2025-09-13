import DirectoryListing from "@/components/browser/DirectoryListing";
import { validateRequest } from "@/lib/auth";

export default async function File() {
  const { user } = await validateRequest();

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white border-2 border-gray-300  rounded-lg p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">로그인 필요</h1>
          <p className="text-gray-600">파일 관리를 위해 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white border-2 border-gray-300  rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📁 파일 관리</h1>
        <p className="text-gray-600">웹사이트 파일을 관리하고 편집하세요.</p>
      </div>
      <DirectoryListing paths={["/"]} />
    </div>
  );
}
