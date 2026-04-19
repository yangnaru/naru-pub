import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  MemoryKvStore,
} from "@fedify/fedify";
import {
  Accept,
  Activity,
  Endpoints,
  Follow,
  Person,
  Undo,
} from "@fedify/fedify/vocab";
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
      outbox: ctx.getOutboxUri(identifier),
      followers: ctx.getFollowersUri(identifier),
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

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor") return;
    const identifier = parsed.identifier;

    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return;

    const follower = await follow.getActor(ctx);
    if (!follower?.id || !follower.inboxId) return;

    await db
      .insertInto("followers")
      .values({
        user_id: user.id,
        actor_iri: follower.id.href,
        inbox_iri: follower.inboxId.href,
        shared_inbox_iri:
          follower.endpoints?.sharedInbox?.href ?? null,
      })
      .onConflict((oc) =>
        oc.columns(["user_id", "actor_iri"]).doUpdateSet({
          inbox_iri: follower.inboxId!.href,
          shared_inbox_iri:
            follower.endpoints?.sharedInbox?.href ?? null,
        })
      )
      .execute();

    await ctx.sendActivity(
      { identifier },
      follower,
      new Accept({
        actor: ctx.getActorUri(identifier),
        object: follow,
      })
    );
  })
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject(ctx);
    if (!(object instanceof Follow)) return;

    const parsed = ctx.parseUri(object.objectId);
    if (parsed?.type !== "actor") return;
    const actorId = undo.actorId;
    if (!actorId) return;

    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", parsed.identifier)
      .executeTakeFirst();
    if (!user) return;

    await db
      .deleteFrom("followers")
      .where("user_id", "=", user.id)
      .where("actor_iri", "=", actorId.href)
      .execute();
  });

federation.setFollowersDispatcher(
  "/users/{identifier}/followers",
  async (_ctx, identifier, cursor) => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return null;

    const pageSize = 50;
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    if (Number.isNaN(offset) || offset < 0) return null;

    const rows = await db
      .selectFrom("followers")
      .select(["actor_iri", "inbox_iri", "shared_inbox_iri"])
      .where("user_id", "=", user.id)
      .orderBy("id", "asc")
      .limit(pageSize + 1)
      .offset(offset)
      .execute();

    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize).map((r) => ({
      id: new URL(r.actor_iri),
      inboxId: new URL(r.inbox_iri),
      endpoints: r.shared_inbox_iri
        ? { sharedInbox: new URL(r.shared_inbox_iri) }
        : null,
    }));

    return {
      items,
      nextCursor: hasMore ? String(offset + pageSize) : null,
    };
  }
)
  .setCounter(async (_ctx, identifier) => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return null;

    const result = await db
      .selectFrom("followers")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();

    return BigInt(result.count);
  })
  .setFirstCursor(() => "0");

federation
  .setOutboxDispatcher(
    "/users/{identifier}/outbox",
    async (ctx, identifier, cursor) => {
      const user = await db
        .selectFrom("users")
        .select("id")
        .where("login_name", "=", identifier)
        .executeTakeFirst();
      if (!user) return null;

      const pageSize = 20;
      const offset = cursor ? Number.parseInt(cursor, 10) : 0;
      if (Number.isNaN(offset) || offset < 0) return null;

      const rows = await db
        .selectFrom("activities")
        .select("payload")
        .where("user_id", "=", user.id)
        .orderBy("created_at", "desc")
        .limit(pageSize + 1)
        .offset(offset)
        .execute();

      const hasMore = rows.length > pageSize;
      const items = await Promise.all(
        rows.slice(0, pageSize).map((row) =>
          Activity.fromJsonLd(row.payload, {
            contextLoader: ctx.contextLoader,
            documentLoader: ctx.documentLoader,
          })
        )
      );

      return {
        items,
        nextCursor: hasMore ? String(offset + pageSize) : null,
      };
    }
  )
  .setCounter(async (_ctx, identifier) => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("login_name", "=", identifier)
      .executeTakeFirst();
    if (!user) return null;

    const result = await db
      .selectFrom("activities")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();

    return BigInt(result.count);
  })
  .setFirstCursor(() => "0");
