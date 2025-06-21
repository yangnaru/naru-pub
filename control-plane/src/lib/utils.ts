import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { S3Client } from "@aws-sdk/client-s3";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPublicAssetUrl(username: string, filename: string) {
  const pathname = filename.replaceAll("//", "/").replace(/^\//, "");

  return process.env.NODE_ENV === "production"
    ? `https://${username}.${process.env.NEXT_PUBLIC_DOMAIN}/${pathname}`
    : `http://${username}.${process.env.NEXT_PUBLIC_DOMAIN}/${pathname}`;
}

export function getHomepageUrl(username: string) {
  return process.env.NODE_ENV === "production"
    ? `https://${username}.${process.env.NEXT_PUBLIC_DOMAIN}`
    : `http://${username}.${process.env.NEXT_PUBLIC_DOMAIN}`;
}

export function getRenderedSiteUrl(username: string) {
  return `https://r2-screenshots.${process.env.NEXT_PUBLIC_DOMAIN}/${username}.png`;
}

export function getUserHomeDirectory(loginName: string) {
  return `${loginName}`;
}

export const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
