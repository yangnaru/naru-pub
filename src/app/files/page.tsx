import DirectoryListing from "@/components/DirectoryListing";
import { validateRequest } from "@/lib/auth";

export default async function File() {
  const { user } = await validateRequest();

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return <DirectoryListing paths={["/"]} />;
}
