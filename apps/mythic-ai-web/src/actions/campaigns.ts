"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { redirect, unauthorized } from "next/navigation";
import { generateWorld } from "@/lib/ai/setting";

export async function getCampaign(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return unauthorized();
  }

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, Number(id)),
  });

  if (campaign?.userId !== session.user.id) {
    return unauthorized();
  }

  return campaign;
}

export async function getCampaigns() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userCampaigns = await db.query.campaigns.findMany({
    where: eq(campaigns.userId, session.user.id),
    orderBy: [desc(campaigns.createdAt)],
  });

  return userCampaigns;
}

export async function createCampaign(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const worldSetting = await generateWorld();

  if (!name || !description) {
    throw new Error("Name and description are required");
  }

  await db.insert(campaigns).values({
    name,
    description,
    userId: session.user.id,
    worldSetting,
  });

  redirect("/campaigns");
}
