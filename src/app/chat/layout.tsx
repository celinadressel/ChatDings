import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profile des aktuellen Nutzers laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Chats des Nutzers laden (mit letzter Nachricht)
  const { data: chatMembers } = await supabase
    .from("chat_members")
    .select(
      `
      chat_id,
      chats (
        id,
        name,
        is_group,
        created_at,
        messages (
          content,
          created_at,
          sender_id
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  type ChatEntry = NonNullable<typeof chatMembers>[0]["chats"];
  const chats = (chatMembers ?? []).map((m) => m.chats).filter((c): c is NonNullable<ChatEntry> => c !== null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar chats={chats ?? []} currentUser={profile} />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
