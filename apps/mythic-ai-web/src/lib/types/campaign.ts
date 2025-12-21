import { campaigns } from "@/db/schema";

export type Campaign = typeof campaigns.$inferSelect;
