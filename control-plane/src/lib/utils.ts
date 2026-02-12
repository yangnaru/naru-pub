import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { S3Client } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that the request is a legitimate JSON API call, not a form submission.
 * Uses two layers of defense:
 *
 * 1. Content-Type check: Forms can only send application/x-www-form-urlencoded,
 *    multipart/form-data, or text/plain - not application/json.
 *
 * 2. Sec-Fetch-* headers: Automatically set by browsers, cannot be forged.
 *    Normal API call (fetch): Sec-Fetch-Dest: empty, Sec-Fetch-Mode: cors
 *    Form submission:         Sec-Fetch-Dest: document, Sec-Fetch-Mode: navigate
 */
export function assertJsonContentType(request: NextRequest): void {
  // Check 1: Content-Type must be application/json
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }

  // Check 2: Sec-Fetch-* headers (if present) must indicate API call
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const secFetchMode = request.headers.get("sec-fetch-mode");

  if (secFetchDest && secFetchDest !== "empty") {
    throw new Error("Invalid request: not an API call");
  }
  if (secFetchMode && secFetchMode === "navigate") {
    throw new Error("Invalid request: form submissions not allowed");
  }
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
