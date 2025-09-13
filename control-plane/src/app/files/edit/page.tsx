import DirectoryListing from "@/components/browser/DirectoryListing";

export default async function Files() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <DirectoryListing paths={["/"]} />
    </div>
  );
}
