import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DirectoryBreadcrumb({ paths }: { paths: string[] }) {
  const currentFilename = paths[paths.length - 1];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/files">홈</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {paths.length > 0 &&
          paths.slice(0, -1).map((dir, index) => {
            const parentDirectory = paths.slice(0, index + 1).join("/");

            if (parentDirectory === "/") {
              return null;
            }

            return (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/files/edit/${parentDirectory}`}>
                    {dir}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            );
          })}

        {currentFilename && (
          <BreadcrumbItem>
            <BreadcrumbPage>{paths[paths.length - 1]}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
