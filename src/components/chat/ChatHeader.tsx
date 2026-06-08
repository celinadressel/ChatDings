"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addChatMember, removeChatMember } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  members?: ChatMemberWithProfile[];
  currentUserRole?: "admin" | "member";
  currentUserId?: string;
}

export function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  chatId,
  members = [],
  currentUserRole = "member",
  currentUserId,
}: ChatHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isAdmin = currentUserRole === "admin";

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
          <h1 className="text-sm font-semibold truncate">{chatName}</h1>
          <p className="text-xs text-muted-foreground">
            {isGroup ? `${memberCount} Mitglieder` : "Direktnachricht"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono shrink-0 opacity-50 hidden sm:inline-flex">
            #{chatId.slice(0, 8)}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowInfo(true)}
            title="Chat-Details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Info / Management Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl p-5 space-y-4 transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                {isGroup ? (
                  <Users className="h-4 w-4 text-violet-400" />
                ) : (
                  <User className="h-4 w-4 text-blue-400" />
                )}
                <h2 className="font-semibold text-sm">Chat-Details</h2>
              </div>
              <button
                onClick={() => {
                  setShowInfo(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat info summary */}
            <div className="text-center py-4 bg-muted/20 border border-border/30 rounded-xl space-y-1">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80">
                {isGroup ? (
                  <Users className="h-8 w-8 text-violet-400" />
                ) : (
                  <User className="h-8 w-8 text-blue-400" />
                )}
              </div>
              <h3 className="font-semibold text-base">{chatName}</h3>
              <p className="text-xs text-muted-foreground">
                {isGroup ? `${members.length} Mitglieder` : "Direktnachricht"} • ID: {chatId}
              </p>
            </div>

            {/* Group Members List */}
            {isGroup && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Mitglieder</Label>
                  {isAdmin && <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px]">Du bist Admin</Badge>}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const profile = member.profiles;
                    if (!profile) return null;
                    const isSelf = member.user_id === currentUserId;

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/30 border border-border/10"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-muted text-[10px] font-semibold">
                              {getInitials(profile.display_name ?? profile.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {profile.display_name ?? profile.username} {isSelf && "(Du)"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              @{profile.username}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {member.role === "admin" ? (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] px-1.5 py-0">
                              <Crown className="h-2 w-2 mr-1 inline" /> Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 opacity-70">
                              Mitglied
                            </Badge>
                          )}

                          {/* Delete/Leave buttons */}
                          {isAdmin && !isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={isPending}
                              title="Mitglied entfernen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={isPending}
                              title="Gruppe verlassen"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin Controls: Add Members */}
            {isGroup && isAdmin && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label htmlFor="member-search" className="text-xs font-semibold">Mitglied hinzufügen</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="member-search"
                    placeholder="Nutzername suchen..."
                    className="pl-8 h-8 text-xs bg-muted/20"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                {isSearching && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto bg-muted/10 border border-border/20 p-1 rounded-xl">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                              {getInitials(user.display_name ?? user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium truncate">
                              {user.display_name ?? user.username}
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-primary hover:bg-primary/10"
                          onClick={() => handleAddMember(user.id)}
                          disabled={isPending}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground py-1">
                    Keine passenden Nutzer gefunden
                  </p>
                )}
              </div>
            )}

            {/* Direct Chat: display basic user profile */}
            {!isGroup && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Empfängerprofil</Label>
                <div className="p-3 bg-muted/10 rounded-xl space-y-2 text-xs">
                  {members
                    .filter((m) => m.user_id !== currentUserId)
                    .map((m) => {
                      const profile = m.profiles;
                      if (!profile) return null;
                      return (
                        <div key={m.user_id} className="space-y-1">
                          <p><span className="text-muted-foreground font-medium">Anzeigename:</span> {profile.display_name ?? "Keiner"}</p>
                          <p><span className="text-muted-foreground font-medium">Nutzername:</span> @{profile.username}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowInfo(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
