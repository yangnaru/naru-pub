import { drizzle } from "drizzle-orm/d1";

import type { InferSelectModel } from "drizzle-orm";
import { users, sessions } from "@/drizzle/schema";
import * as schema from "@/drizzle/schema";
import * as relations from "@/drizzle/relations";

export const db = drizzle({
  connection: process.env.DB!,
  schema: { ...schema, ...relations },
});

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
