import {
  sqliteTable,
  AnySQLiteColumn,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer().primaryKey(),
  loginName: text("login_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  email: text(),
  createdAt: integer("created_at").notNull(),
  siteUpdatedAt: integer("site_updated_at"),
  discoverable: integer().notNull().default(0),
  siteRenderedAt: integer("site_rendered_at"),
});
