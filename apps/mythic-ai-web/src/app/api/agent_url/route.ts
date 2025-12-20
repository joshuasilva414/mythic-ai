import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse<string>> {
  const user = auth.api.getSession({
    headers: await headers(),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!process.env.AGENT_ID) {
    throw new Error("AGENT_ID not found");
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not found");
  }
  const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.AGENT_ID}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY as string,
    },
  });
  if (!response.ok) {
    console.log(response);
    throw new Error("Failed to fetch agent URL");
  }
  const data: { signed_url: string } = await response.json();
  console.log(data.signed_url);

  return new NextResponse(data.signed_url, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
