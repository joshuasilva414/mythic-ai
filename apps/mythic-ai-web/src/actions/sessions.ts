"use server";

import { auth } from "@/lib/auth";
import { db } from "db";
import { sessions, campaigns } from "db/schema";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { unauthorized } from "next/navigation";

export async function getSessions(campaignId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return unauthorized();
  }

  // Verify the user owns this campaign
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  });

  if (!campaign || campaign.userId !== session.user.id) {
    return unauthorized();
  }

  const campaignSessions = await db.query.sessions.findMany({
    where: eq(sessions.campaignId, campaignId),
    orderBy: [desc(sessions.createdAt)],
  });

  return campaignSessions;
}
