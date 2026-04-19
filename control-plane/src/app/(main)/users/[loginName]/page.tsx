import { notFound, redirect } from "next/navigation";
import { LOGIN_NAME_REGEX } from "@/lib/const";

// The actor JSON-LD at this path is served by Fedify via proxy.ts whenever
// the Accept header is application/activity+json (or the other federation
// media types). Anything else — browser navigations, curl without Accept —
// lands here and gets redirected to the user's site.
export default async function UserRedirect({
  params,
}: {
  params: Promise<{ loginName: string }>;
}) {
  const { loginName } = await params;
  if (!LOGIN_NAME_REGEX.test(loginName)) notFound();
  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? "naru.pub";
  redirect(`https://${loginName}.${domain}/`);
}
