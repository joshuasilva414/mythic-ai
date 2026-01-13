import { Conversation } from "@/components/Conversation";
import { getCampaign } from "@/actions/campaigns";
import { Campaign } from "@/lib/types/campaign";
import { notFound } from "next/navigation";
import { dungeonMasterPrompt } from "@/lib/ai/prompts/dm";

export default async function Home({
  params,
}: {
  params: { campaignId: string };
}) {
  const { campaignId } = await params;
  const campaign: Campaign | undefined = await getCampaign(campaignId);

  if (!campaign) {
    return notFound();
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Conversation campaignId={campaignId} />
    </div>
  );
}
