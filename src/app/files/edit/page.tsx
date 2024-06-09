import DirectoryListing from "@/components/DirectoryListing";

export default async function Files() {
  return <DirectoryListing paths={["/"]} />;
}
