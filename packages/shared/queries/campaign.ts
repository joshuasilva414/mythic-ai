import type { Database, campaigns as campaignsSchema } from "db";
import { eq } from "drizzle-orm";

type CampaignsTable = typeof campaignsSchema;

export const getWorldSetting = async (
  db: Database,
  campaigns: CampaignsTable,
  id: number
) => {
  const world = await db.select().from(campaigns).where(eq(campaigns.id, id));
  return world[0]?.worldSetting;
};
