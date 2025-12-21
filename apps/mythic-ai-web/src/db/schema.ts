import { relations, sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const campaigns = sqliteTable("campaigns", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  worldSetting: text("world_setting").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP` as any),
});

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(user, {
    fields: [campaigns.userId],
    references: [user.id],
  }),
}));

export * from "./auth-schema";
