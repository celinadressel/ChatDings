"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
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
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
  // Keep a stable ref of known chat IDs so the subscription closure doesn't go stale
  const chatIdsRef = useRef<string[]>(chats.map((c) => c.id));
  // Mirror pathname in a ref so the Realtime callback always reads the current value
  // without needing to re-subscribe every time the user navigates
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Sync ref when chats prop changes
  useEffect(() => {
    chatIdsRef.current = chats.map((c) => c.id);
  }, [chats]);

  // Clear unread indicator when the user navigates to a chat
  useEffect(() => {
    const activeChatId = pathname.startsWith("/chat/")
      ? pathname.split("/chat/")[1]
      : null;
    if (activeChatId) {
      setUnreadChatIds((prev) => {
        if (!prev.has(activeChatId)) return prev; // no-op if already clean
        const next = new Set(prev);
        next.delete(activeChatId);
        return next;
      });
    }
  }, [pathname]);

  // Subscribe to all new messages across all chats the user is a member of
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as { chat_id: string; sender_id: string };
          // RLS guarantees we only receive messages for chats we're a member of.
          // Only mark as unread if this is NOT the chat currently open.
          const currentPath = pathnameRef.current;
          const activeChatId = currentPath.startsWith("/chat/")
            ? currentPath.split("/chat/")[1]
            : null;
          if (newMsg.chat_id !== activeChatId) {
            setUnreadChatIds((prev) => {
              if (prev.has(newMsg.chat_id)) return prev; // already marked
              const next = new Set(prev);
              next.add(newMsg.chat_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // We intentionally omit `pathname` from deps – we read it via the closure
  // at event-time which is fine; the effect only needs to (re-)subscribe once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <aside className="w-80 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex h-[60px] items-center justify-between border-b border-border/50 px-4 shrink-0">
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

                const hasUnread = unreadChatIds.has(chat.id);

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
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
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
                      {/* Unread indicator dot */}
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-background" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive ? "text-primary" : "text-foreground",
                            hasUnread && !isActive && "font-semibold text-foreground"
                          )}
                        >
                          {displayName}
                        </span>
                        {lastMessage ? (
                          <span className={cn(
                            "shrink-0 text-xs",
                            hasUnread && !isActive
                              ? "text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          )}>
                            {formatTime(lastMessage.created_at)}
                          </span>
                        ) : null}
                      </div>

                      {lastMessage ? (
                        <p className={cn(
                          "mt-0.5 truncate text-xs",
                          hasUnread && !isActive
                            ? "text-foreground/80 font-medium"
                            : "text-muted-foreground"
                        )}>
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

        <div className="flex h-[64px] items-center gap-3 px-3 shrink-0">
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
