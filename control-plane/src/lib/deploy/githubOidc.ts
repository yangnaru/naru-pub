import { createPublicKey, verify, type JsonWebKey } from "crypto";

const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_ACTIONS_JWKS_URL =
  "https://token.actions.githubusercontent.com/.well-known/jwks";

type Jwk = JsonWebKey & { kid?: string; alg?: string };

let cachedJwks: { keys: Jwk[]; expiresAt: number } | null = null;

export type GitHubActionsClaims = {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  nbf?: number;
  iat?: number;
  repository: string;
  ref: string;
  sha: string;
  workflow_ref?: string;
};

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function timingSafeAudienceIncludes(aud: string | string[], expected: string) {
  return Array.isArray(aud) ? aud.includes(expected) : aud === expected;
}

function expectedAudience() {
  return (
    process.env.GITHUB_DEPLOY_AUDIENCE ||
    (process.env.NEXT_PUBLIC_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
      : "https://naru.pub")
  );
}

async function getJwks(): Promise<Jwk[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }

  const response = await fetch(GITHUB_ACTIONS_JWKS_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch GitHub Actions OIDC keys");
  }

  const body = (await response.json()) as { keys?: Jwk[] };
  if (!Array.isArray(body.keys)) {
    throw new Error("Invalid GitHub Actions OIDC key set");
  }

  cachedJwks = {
    keys: body.keys,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  return body.keys;
}

export async function verifyGitHubActionsToken(
  token: string,
): Promise<GitHubActionsClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid OIDC token format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(
    base64UrlDecode(encodedHeader).toString("utf8"),
  ) as {
    alg?: string;
    kid?: string;
  };
  const claims = JSON.parse(
    base64UrlDecode(encodedPayload).toString("utf8"),
  ) as Partial<GitHubActionsClaims>;

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported OIDC token signature");
  }

  const jwk = (await getJwks()).find((key) => key.kid === header.kid);
  if (!jwk) {
    cachedJwks = null;
    throw new Error("No matching GitHub Actions OIDC key");
  }

  const publicKey = createPublicKey({ key: jwk as JsonWebKey, format: "jwk" });
  const validSignature = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    base64UrlDecode(encodedSignature),
  );
  if (!validSignature) {
    throw new Error("Invalid OIDC token signature");
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== GITHUB_ACTIONS_ISSUER) {
    throw new Error("Invalid OIDC issuer");
  }
  if (
    !claims.aud ||
    !timingSafeAudienceIncludes(claims.aud, expectedAudience())
  ) {
    throw new Error("Invalid OIDC audience");
  }
  if (!claims.exp || claims.exp <= now) {
    throw new Error("Expired OIDC token");
  }
  if (claims.nbf && claims.nbf > now) {
    throw new Error("OIDC token is not yet valid");
  }
  if (!claims.sub || !claims.repository || !claims.ref || !claims.sha) {
    throw new Error("OIDC token is missing required GitHub claims");
  }

  return claims as GitHubActionsClaims;
}

export function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
