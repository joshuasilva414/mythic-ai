import { Conversation } from "@/components/Conversation";

export default async function Home() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Conversation />
    </div>
  );
}
