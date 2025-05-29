import { relations } from "drizzle-orm/relations";
import { sessions, users } from "./schema";

export const userRelations = relations(users, ({ one }) => ({
  session: one(sessions, {
    fields: [users.id],
    references: [sessions.userId],
  }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
