import DirectoryListing from "@/components/browser/DirectoryListing";

export default async function Files() {
  return <DirectoryListing paths={["/"]} />;
}
