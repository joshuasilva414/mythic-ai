import type { Database, sessions as sessionsSchema } from "db";
import { eq } from "drizzle-orm";

type SessionsTable = typeof sessionsSchema;

export const getSessions = async (
  db: Database,
  sessions: SessionsTable,
  campaignId: number
) => {
  const campaignSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.campaignId, campaignId));
  return campaignSessions;
};
