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

  // Parallelize root fetching & drastically limit message scans to only the single latest item
  const [profileResponse, membersResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("chat_members")
      .select(
        `
        chat_id,
        chats (
          id,
          name,
          is_group,
          created_at,
          chat_members (
            user_id,
            profiles (
              id,
              username,
              display_name,
              avatar_url
            )
          ),
          messages (
            content,
            created_at,
            sender_id
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      // Critical optimization: Only pull down the latest message metadata for the sidebar preview
      .limit(1, { foreignTable: "chats.messages" }) 
  ]);

  const profile = profileResponse.data;
  const chatMembers = membersResponse.data;

  type ChatEntry = NonNullable<typeof chatMembers>[0]["chats"];
  
  const chats = (chatMembers ?? [])
    .map((member) => {
      const chat = member.chats;
      if (!chat) return null;

      const otherMember = chat.is_group
        ? null
        : chat.chat_members?.find(
            (chatMember: { user_id: string }) => chatMember.user_id !== user.id
          );
      const otherProfile = otherMember?.profiles as
        | {
            username: string;
            display_name: string | null;
            avatar_url: string | null;
          }
        | null
        | undefined;

      return {
        ...chat,
        display_name:
          chat.name ??
          (chat.is_group
            ? "Gruppe"
            : otherProfile?.display_name ?? otherProfile?.username ?? "Direkt-Chat"),
        avatar_url: otherProfile?.avatar_url ?? null,
      };
    })
    .filter((chat): chat is NonNullable<ChatEntry> & {
      display_name: string;
      avatar_url: string | null;
    } => chat !== null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar chats={chats ?? []} currentUser={profile} />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}