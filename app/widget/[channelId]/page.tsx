import { notFound } from "next/navigation";
import ChatWidget from "@/components/chat-widget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EmbeddedChatPage({ params }: { params: { channelId: string } }) {
  const channel = await prisma.channelConnection.findUnique({
    where: { id: params.channelId },
    select: { id: true, platform: true, enabled: true },
  });
  if (!channel || channel.platform !== "chat_plugin" || !channel.enabled) notFound();

  return (
    <main className="relative min-h-screen bg-transparent">
      <ChatWidget channelConnectionId={channel.id} />
    </main>
  );
}
