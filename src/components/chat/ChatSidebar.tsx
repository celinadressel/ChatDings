"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LogOut,
  MessageSquare,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewChatDialog } from "@/components/chat/NewChatDialog";

interface Chat {
  id: string;
  name: string | null;
  display_name?: string;
  avatar_url?: string | null;
  is_group: boolean;
  created_at: string;
  chat_members?: {
    user_id: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      display_name: string | null;
    } | null;
  }[];
  messages?: { content: string; created_at: string }[];
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status?: string | null;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentUser: Profile | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getChatDisplayData(chat: Chat, currentUser: Profile | null) {
  let displayName =
    chat.display_name ?? chat.name ?? (chat.is_group ? "Gruppe" : "Direkt-Chat");
  let avatarUrl = chat.avatar_url ?? null;

  if (!chat.is_group && chat.chat_members && currentUser) {
    const otherMember = chat.chat_members.find(
      (member) => member.user_id !== currentUser.id
    );
    const otherProfile = otherMember?.profiles;

    if (otherProfile) {
      displayName =
        otherProfile.display_name ?? otherProfile.username ?? displayName;
      avatarUrl = otherProfile.avatar_url;
    }
  }

  return { displayName, avatarUrl };
}

export function ChatSidebar({ chats, currentUser }: ChatSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-80 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Chat-Dings</span>
          </div>
          <NewChatDialog />
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" />
            <span>Suche...</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p>Noch keine Chats.</p>
              <p className="text-xs">Klicke auf + um einen zu starten.</p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {chats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const lastMessage = chat.messages?.[chat.messages.length - 1];
                const { displayName, avatarUrl } = getChatDisplayData(
                  chat,
                  currentUser
                );

                return (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    id={`chat-item-${chat.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-muted/60",
                      isActive && "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={displayName} />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          "text-xs font-semibold",
                          chat.is_group
                            ? "bg-violet-500/20 text-violet-400"
                            : "bg-blue-500/20 text-blue-400"
                        )}
                      >
                        {chat.is_group ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          getInitials(displayName)
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive ? "text-primary" : "text-foreground"
                          )}
                        >
                          {displayName}
                        </span>
                        {lastMessage ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(lastMessage.created_at)}
                          </span>
                        ) : null}
                      </div>

                      {lastMessage ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {lastMessage.content}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex items-center gap-3 px-3 py-3">
          <Link
            href="/chat/profile"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 transition-all hover:bg-muted/60",
              pathname === "/chat/profile" &&
                "bg-primary/10 text-primary hover:bg-primary/15"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              {currentUser?.avatar_url ? (
                <AvatarImage
                  src={currentUser.avatar_url}
                  alt={currentUser.display_name ?? currentUser.username}
                />
              ) : null}
              <AvatarFallback className="bg-emerald-500/20 text-xs font-semibold text-emerald-400">
                {currentUser?.display_name
                  ? getInitials(currentUser.display_name)
                  : currentUser?.username?.slice(0, 2).toUpperCase() ?? "??"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {currentUser?.display_name ?? currentUser?.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{currentUser?.username}
              </p>
            </div>
          </Link>

          <Link
            href="/chat/profile"
            id="profile-button"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
              pathname === "/chat/profile" &&
                "bg-primary/10 text-primary hover:bg-primary/15"
            )}
            title="Mein Profil"
          >
            <UserRound className="h-4 w-4" />
          </Link>

          <form action={signOut}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              id="logout-button"
              title="Abmelden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
