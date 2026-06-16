"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  LogOut,
  Users,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewChatDialog } from "@/components/chat/NewChatDialog";

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  chat_members?: {
    user_id: string;
    profiles: {
      id: string;
      username: string;
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
}

interface ChatSidebarProps {
  chats: Chat[];
  currentUser: Profile | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
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

export function ChatSidebar({ chats, currentUser }: ChatSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-80 flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Chat-Dings</span>
        </div>
        <NewChatDialog />
      </div>

      {/* Search (dummy, für zukünftige Implementierung) */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4 shrink-0" />
          <span>Suche…</span>
        </div>
      </div>

      {/* Chat-Liste */}
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
              let displayName = chat.name ?? (chat.is_group ? "Gruppe" : "Direkt-Chat");
              if (!chat.is_group && chat.chat_members && currentUser) {
                const otherMember = chat.chat_members.find((m) => m.user_id !== currentUser.id);
                const otherProfile = otherMember?.profiles;
                if (otherProfile) {
                  displayName = otherProfile.display_name ?? otherProfile.username ?? displayName;
                }
              }

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
                    <AvatarFallback className={cn(
                      "text-xs font-semibold",
                      chat.is_group
                        ? "bg-violet-500/20 text-violet-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}>
                      {chat.is_group ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        getInitials(displayName)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {displayName}
                      </span>
                      {lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lastMessage.content}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Nutzerprofil unten */}
      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {currentUser?.display_name
              ? getInitials(currentUser.display_name)
              : currentUser?.username?.slice(0, 2).toUpperCase() ?? "??"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {currentUser?.display_name ?? currentUser?.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{currentUser?.username}
          </p>
        </div>
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
    </aside>
  );
}
