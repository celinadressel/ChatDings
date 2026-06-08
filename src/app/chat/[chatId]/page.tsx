import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatHeader } from "@/components/chat/ChatHeader";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Prüfen ob Nutzer Mitglied in diesem Chat ist
  const { data: membership } = await supabase
    .from("chat_members")
    .select("role")
    .eq("chat_id", chatId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  // Chat-Infos laden
  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single();

  if (!chat) notFound();

  // Mitglieder mit Profilen laden
  const { data: members } = await supabase
    .from("chat_members")
    .select("user_id, role, profiles(*)")
    .eq("chat_id", chatId);

  // Nachrichten laden
  const { data: messages } = await supabase
    .from("messages")
    .select("*, profiles!sender_id(*)")
    .eq("chat_id", chatId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(100);

  // Chat-Name für DMs aus dem anderen Mitglied ableiten
  let chatDisplayName = chat.name ?? "Unbenannter Chat";
  if (!chat.is_group && members) {
    const otherMember = members.find((m) => m.user_id !== user.id);
    const otherProfile = otherMember?.profiles as
      | { display_name?: string | null; username?: string }
      | null;
    if (otherProfile) {
      chatDisplayName =
        otherProfile.display_name ?? otherProfile.username ?? chatDisplayName;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        chatName={chatDisplayName}
        isGroup={chat.is_group}
        memberCount={members?.length ?? 0}
        chatId={chatId}
        members={(members ?? []) as any}
        currentUserRole={membership.role as "admin" | "member"}
        currentUserId={user.id}
      />
      <MessageList
        messages={messages ?? []}
        currentUserId={user.id}
      />
      <MessageInput chatId={chatId} />
    </div>
  );
}
