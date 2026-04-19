import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  MemoryKvStore,
} from "@fedify/fedify";
import { Endpoints, Person } from "@fedify/fedify/vocab";
import { db } from "./database";

const KEY_ALGORITHMS = ["RSASSA-PKCS1-v1_5", "Ed25519"] as const;
type KeyAlgorithm = (typeof KEY_ALGORITHMS)[number];

// DB stores lowercased/underscored values; keep a single source of truth.
const DB_KEY_TYPE: Record<KeyAlgorithm, string> = {
  "RSASSA-PKCS1-v1_5": "rsassa-pkcs1-v1_5",
  Ed25519: "ed25519",
};

export const federation = createFederation<void>({
  kv: new MemoryKvStore(),
});

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    const user = await db
      .selectFrom("users")
      .select(["id", "login_name"])
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return null;

    // KEY_ALGORITHMS[0] is RSA, so keys[0] is always the RSA pair used for
    // legacy HTTP/Linked Data Signatures exposed via `publicKey`.
    const keys = await ctx.getActorKeyPairs(identifier);
    const siteDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "naru.pub";

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: identifier,
      url: new URL(`https://${identifier}.${siteDomain}/`),
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
      publicKey: keys[0]?.cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
    });
  })
  .setKeyPairsDispatcher(async (_ctx, identifier) => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return [];

    const rows = await db
      .selectFrom("user_keys")
      .select(["key_type", "private_key", "public_key"])
      .where("user_id", "=", user.id)
      .execute();

    const existing = new Map(rows.map((r) => [r.key_type, r]));
    const result: CryptoKeyPair[] = [];

    for (const algo of KEY_ALGORITHMS) {
      const dbType = DB_KEY_TYPE[algo];
      const row = existing.get(dbType);
      if (row) {
        result.push({
          publicKey: await importJwk(row.public_key as JsonWebKey, "public"),
          privateKey: await importJwk(row.private_key as JsonWebKey, "private"),
        });
      } else {
        const pair = await generateCryptoKeyPair(algo);
        await db
          .insertInto("user_keys")
          .values({
            user_id: user.id,
            key_type: dbType,
            public_key: await exportJwk(pair.publicKey),
            private_key: await exportJwk(pair.privateKey),
          })
          .onConflict((oc) => oc.columns(["user_id", "key_type"]).doNothing())
          .execute();
        result.push(pair);
      }
    }

    return result;
  })
  .mapHandle(async (_ctx, username) => {
    const user = await db
      .selectFrom("users")
      .select("login_name")
      .where("login_name", "=", username)
      .executeTakeFirst();
    return user?.login_name ?? null;
  });

// Register inbox route so ctx.getInboxUri() resolves on the actor document.
// Handlers (Follow/Undo/etc.) are wired up in a later step.
federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");
