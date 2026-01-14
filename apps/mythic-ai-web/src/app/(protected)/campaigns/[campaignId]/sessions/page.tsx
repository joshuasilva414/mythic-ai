import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, Clock, Play } from "lucide-react";
import Link from "next/link";

// Dummy session data for development
const dummySessions = [
  {
    id: 1,
    sessionNumber: 1,
    summary:
      "The party met at the Rusty Dragon tavern and accepted a quest to investigate strange occurrences in the abandoned mine.",
    createdAt: "2026-01-10T19:30:00",
    duration: "2h 45m",
  },
  {
    id: 2,
    sessionNumber: 2,
    summary:
      "Deep within the mine, the adventurers discovered an ancient dwarven tomb and faced their first major combat encounter with undead guardians.",
    createdAt: "2026-01-12T19:00:00",
    duration: "3h 15m",
  },
  {
    id: 3,
    sessionNumber: 3,
    summary:
      "After defeating the skeletal warriors, the party found a mysterious artifact and met a ghostly dwarf who revealed the mine's dark history.",
    createdAt: "2026-01-15T18:30:00",
    duration: "2h 30m",
  },
  {
    id: 4,
    sessionNumber: 4,
    summary:
      "The heroes returned to town with the artifact, only to find it had attracted the attention of a secret cult. A chase through the city streets ensued.",
    createdAt: "2026-01-17T19:00:00",
    duration: "3h 00m",
  },
];

export default async function CampaignSessionPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const campaignId = parseInt(params.campaignId);
  // Using dummy data for now
  const previousSessions = dummySessions;

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Start New Session Card */}
        <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6 hover:border-sidebar-primary/50 transition-colors bg-muted/50">
          <CardHeader className="text-center w-full">
            <CardTitle className="text-xl">Start New Session</CardTitle>
            <CardDescription>
              Continue your adventure where you left off.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full flex justify-center">
            <Button asChild className="w-full max-w-xs">
              <Link href={`/campaigns/${campaignId}/play`}>
                <Play className="mr-2 h-4 w-4" /> Begin Session
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Previous Sessions */}
        {previousSessions.map((session) => (
          <Card
            key={session.id}
            className="flex flex-col hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-sidebar-primary" />
                  Session {session.sessionNumber}
                </CardTitle>
              </div>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(session.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {session.duration}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grow">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {session.summary}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/campaigns/${campaignId}/sessions/${session.id}`}>
                  View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
