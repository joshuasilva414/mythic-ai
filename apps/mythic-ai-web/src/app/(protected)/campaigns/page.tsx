import { getCampaigns, createCampaign } from "@/actions/campaigns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Campaigns</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* New Campaign Card */}
        <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6 hover:border-sidebar-primary/50 transition-colors bg-muted/50">
          <CardHeader className="text-center w-full">
            <CardTitle className="text-xl">Start a New Adventure</CardTitle>
            <CardDescription>
              Begin a new journey in the Mythic realms.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full">
            <form action={createCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. The Lost Mines"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="A brief summary..."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Create Campaign
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Campaigns */}
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{campaign.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {campaign.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grow">
              <p className="text-sm text-muted-foreground">
                Created at: {new Date(campaign.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="secondary">
                <Link href={`/campaigns/${campaign.id}/session`}>Play</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
