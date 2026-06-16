import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";

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

  if (!members) notFound();

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
  let chatAvatarUrl: string | null = null;
  if (!chat.is_group && members) {
    const otherMember = members.find((m) => m.user_id !== user.id);
    const otherProfile = otherMember?.profiles as
      | {
          display_name?: string | null;
          username?: string;
          avatar_url?: string | null;
        }
      | null;
    if (otherProfile) {
      chatDisplayName =
        otherProfile.display_name ?? otherProfile.username ?? chatDisplayName;
      chatAvatarUrl = otherProfile.avatar_url ?? null;
    }
  }

  // Format type matching for TS
  const formattedMembers = members.map((m) => ({
    user_id: m.user_id,
    role: m.role as "admin" | "member",
    profiles: m.profiles as {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
    } | null,
  }));

  const formattedMessages = (messages ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    sender_id: m.sender_id,
    profiles: m.profiles as {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null,
  }));

  return (
    <ChatContainer
      chatId={chatId}
      chat={chat}
      initialMessages={formattedMessages}
      members={formattedMembers}
      currentUserId={user.id}
      chatDisplayName={chatDisplayName}
    />
  );
}
