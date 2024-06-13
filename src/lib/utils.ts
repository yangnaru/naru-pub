import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPublicAssetUrl(username: string, filename: string) {
  return process.env.NODE_ENV === "production"
    ? `https://${username}.${process.env.NEXT_PUBLIC_DOMAIN}${filename}`
    : `http://${username}.${process.env.NEXT_PUBLIC_DOMAIN}${filename}`;
}

export function getHomepageUrl(username: string) {
  return process.env.NODE_ENV === "production"
    ? `https://${username}.${process.env.NEXT_PUBLIC_DOMAIN}`
    : `http://${username}.${process.env.NEXT_PUBLIC_DOMAIN}`;
}
