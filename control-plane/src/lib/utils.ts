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
 *    This blocks same-origin form attacks.
 *
 * 2. Sec-Fetch-Site header: Automatically set by browsers, cannot be forged.
 *    Only allows same-origin requests, blocking cross-subdomain attacks
 *    (e.g., attacker.naru.pub -> naru.pub/api).
 */
export function assertJsonContentType(request: NextRequest): void {
  // Check 1: Content-Type must be application/json
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }

  // Check 2: Sec-Fetch-Site must be same-origin (if header present)
  // Blocks: same-site (subdomain attacks), cross-site (external attacks)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin") {
    throw new Error("Invalid request: cross-origin requests not allowed");
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
