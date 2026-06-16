"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addChatMember, removeChatMember } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Map } from "lucide-react";
import {
  ArrowLeft,
  Users,
  User,
  Info,
  X,
  UserPlus,
  Trash2,
  LogOut,
  Crown,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

interface ChatMemberWithProfile {
  user_id: string;
  role: "admin" | "member";
  profiles: Profile | null;
}

interface ChatHeaderProps {
  chatName: string;
  isGroup: boolean;
  memberCount: number;
  chatId: string;
  onToggleMap?: () => void;
  isMapOpen?: boolean;
  isSharingActive?: boolean;
  activeSharersCount?: number;
  members?: ChatMemberWithProfile[];
  currentUserRole?: "admin" | "member";
  currentUserId?: string;
  avatarUrl?: string | null;
}

export function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  chatId,
  avatarUrl,
  onToggleMap,
  isMapOpen = false,
  isSharingActive = false,
  activeSharersCount = 0,
  members = [],
  currentUserRole = "member",
  currentUserId,
}: ChatHeaderProps) {
  const isAnyoneSharing = activeSharersCount > 0;
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isAdmin = currentUserRole === "admin";

    <div className="shrink-0">
      {isGroup ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Users className="h-4 w-4 text-violet-400" />
        </div>
      ) : (
        <Avatar className="h-9 w-9">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={chatName} /> : null}
          <AvatarFallback className="bg-blue-500/20 text-xs font-semibold text-blue-400">
            {chatName ? getInitials(chatName) : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      )}
    </div>

  async function handleSearch(value: string) {
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();
    
    // Find profiles that are NOT already members of this chat
    const memberIds = members.map((m) => m.user_id);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .not("id", "in", `(${memberIds.join(",")})`)
      .or(`username.ilike.%${value}%,display_name.ilike.%${value}%`)
      .limit(5);

    setSearchResults(data ?? []);
    setIsSearching(false);
  }

  function handleAddMember(userId: string) {
    startTransition(async () => {
      const result = await addChatMember(chatId, userId);
      if (result.error) {
        alert(result.error);
        return;
      }
      setSearchQuery("");
      setSearchResults([]);
    });
  }

  function handleRemoveMember(userId: string) {
    const isSelf = userId === currentUserId;
    if (isSelf && !confirm("Möchtest du diese Gruppe wirklich verlassen?")) {
      return;
    }
    if (!isSelf && !confirm("Möchtest du dieses Mitglied wirklich entfernen?")) {
      return;
    }

    startTransition(async () => {
      const result = await removeChatMember(chatId, userId);
      if (result.error) {
        alert(result.error);
        return;
      }

      if (isSelf) {
        setShowInfo(false);
        router.push("/chat");
      }
    });
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border/50 bg-card/30 backdrop-blur-sm px-4 py-3 shrink-0">
        <Link href="/chat" className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted shrink-0">
          {isGroup ? (
            <Users className="h-4 w-4 text-violet-400" />
          ) : (
            <User className="h-4 w-4 text-blue-400" />
          )}
        </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold truncate">{chatName}</h1>
          {isAnyoneSharing && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title={`${activeSharersCount} Person(en) teilen Standort`} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isGroup ? `${memberCount} Mitglieder` : "Direktnachricht"}
          {isAnyoneSharing && ` • ${activeSharersCount} teilen Standort`}
        </p>
      </div>

      {onToggleMap && (
        <Button
          variant={isMapOpen ? "default" : "ghost"}
          size="icon"
          onClick={onToggleMap}
          className="h-8 w-8 relative"
          title="Live-Standorte anzeigen"
        >
          {isSharingActive ? (
            <MapPin className="h-4 w-4 text-emerald-400 animate-bounce" />
          ) : (
            <Map className="h-4 w-4" />
          )}
          {!isMapOpen && isAnyoneSharing && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
            </span>
          )}
        </Button>
      )}

      <Badge variant="outline" className="text-xs font-mono shrink-0 opacity-50 hidden sm:inline-flex">
        #{chatId.slice(0, 8)}
      </Badge>
    </header>
    </>
  );
}
