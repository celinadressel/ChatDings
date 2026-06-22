"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addChatMember,
  removeChatMember,
  updateGroupChat,
  promoteMember,
} from "@/lib/actions/chat";
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
  Settings2,
  X,
  UserPlus,
  Trash2,
  LogOut,
  Crown,
  Search,
  Loader2,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  avatar_url?: string | null;
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
  const isAdmin = currentUserRole === "admin";

  // Panel state
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "settings">("members");

  // Member search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group settings form
  const [groupName, setGroupName] = useState(chatName);
  const [groupAvatarUrl, setGroupAvatarUrl] = useState(avatarUrl ?? "");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Member search ──────────────────────────────────────────────
  async function handleSearch(value: string) {
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();
    const memberIds = members.map((m) => m.user_id);

    // Exclude existing members from results
    let query = supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${value}%,display_name.ilike.%${value}%`)
      .limit(5);

    if (memberIds.length > 0) {
      query = query.not("id", "in", `(${memberIds.join(",")})`);
    }

    const { data } = await query;
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
    const msg = isSelf
      ? "Möchtest du diese Gruppe wirklich verlassen?"
      : "Möchtest du dieses Mitglied wirklich entfernen?";
    if (!confirm(msg)) return;

    startTransition(async () => {
      const result = await removeChatMember(chatId, userId);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (isSelf) {
        setShowPanel(false);
        router.push("/chat");
      }
    });
  }

  function handlePromote(userId: string, name: string) {
    if (!confirm(`${name} zum Admin befördern?`)) return;
    startTransition(async () => {
      const result = await promoteMember(chatId, userId);
      if (result.error) alert(result.error);
    });
  }

  // ── Group settings ─────────────────────────────────────────────
  function handleSaveSettings() {
    setSettingsError(null);
    setSettingsSuccess(null);
    startTransition(async () => {
      const result = await updateGroupChat({
        chat_id: chatId,
        name: groupName,
        avatar_url: groupAvatarUrl || undefined,
      });
      if (result.error) {
        setSettingsError(result.error);
      } else {
        setSettingsSuccess("Gespeichert ✓");
        setTimeout(() => setSettingsSuccess(null), 3000);
      }
    });
  }

  return (
    <>
      {/* ── Main header bar ─────────────────────────────────────────── */}
      <header className="flex h-[60px] items-center gap-3 border-b border-border/50 bg-card/30 backdrop-blur-sm px-4 shrink-0">
        <Link href="/chat" className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        {/* Avatar */}
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

        {/* Title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold truncate">{chatName}</h1>
            {isAnyoneSharing && (
              <span
                className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                title={`${activeSharersCount} Person(en) teilen Standort`}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isGroup ? `${memberCount} Mitglieder` : "Direktnachricht"}
            {isAnyoneSharing && ` • ${activeSharersCount} teilen Standort`}
          </p>
        </div>

        {/* Map toggle */}
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
              </span>
            )}
          </Button>
        )}

        {/* Group settings button – only for group chats */}
        {isGroup && (
          <Button
            variant={showPanel ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            title="Gruppe bearbeiten"
            onClick={() => setShowPanel((v) => !v)}
            id="group-settings-button"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}

        <Badge
          variant="outline"
          className="text-xs font-mono shrink-0 opacity-50 hidden sm:inline-flex"
        >
          #{chatId.slice(0, 8)}
        </Badge>
      </header>

      {/* ── Side panel ──────────────────────────────────────────────── */}
      {isGroup && showPanel && (
        <div className="absolute inset-y-0 right-0 z-40 w-80 border-l border-border/50 bg-card/95 backdrop-blur-md shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
            <span className="text-sm font-semibold">Gruppe bearbeiten</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-2 bg-muted/30 border-b border-border/50 shrink-0">
            {(["members", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-medium transition-all",
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "members" ? "👥 Mitglieder" : "⚙️ Einstellungen"}
              </button>
            ))}
          </div>

          {/* ── Members tab ───────────────────────────────────────── */}
          {activeTab === "members" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Current members list */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Mitglieder ({members.length})
                </Label>
                <div className="space-y-1 mt-1">
                  {members.map((member) => {
                    const profile = member.profiles;
                    const name =
                      profile?.display_name ?? profile?.username ?? "Unbekannt";
                    const isSelf = member.user_id === currentUserId;
                    const isAlreadyAdmin = member.role === "admin";

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-muted/40 group"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {profile?.avatar_url ? (
                            <AvatarImage src={profile.avatar_url} alt={name} />
                          ) : null}
                          <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs font-semibold">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            @{profile?.username}
                          </p>
                        </div>
                        {isAlreadyAdmin && (
                          <Crown
                            className="h-3.5 w-3.5 text-amber-400 shrink-0"
                            aria-label="Admin"
                          />
                        )}
                        {/* Action buttons – only visible on hover for admins */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isAlreadyAdmin && (
                              <button
                                title="Zum Admin befördern"
                                onClick={() => handlePromote(member.user_id, name)}
                                disabled={isPending}
                                className="p-1 rounded-md hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors disabled:opacity-40"
                              >
                                <Crown className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              title={isSelf ? "Gruppe verlassen" : "Entfernen"}
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={isPending}
                              className={cn(
                                "p-1 rounded-md transition-colors disabled:opacity-40",
                                isSelf
                                  ? "hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400"
                                  : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              )}
                            >
                              {isSelf ? (
                                <LogOut className="h-3.5 w-3.5" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                        {/* Non-admins can only leave themselves */}
                        {!isAdmin && isSelf && (
                          <button
                            title="Gruppe verlassen"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={isPending}
                            className="p-1 rounded-md hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add member search – admins only */}
              {isAdmin && (
                <div className="space-y-2 border-t border-border/40 pt-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    Mitglied hinzufügen
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="add-member-search"
                      placeholder="Name oder @Nutzername…"
                      className="pl-8 h-8 text-sm bg-muted/30"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-0.5">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddMember(user.id)}
                          disabled={isPending}
                          className="flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            {user.avatar_url ? (
                              <AvatarImage src={user.avatar_url} alt={user.display_name ?? user.username} />
                            ) : null}
                            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                              {getInitials(user.display_name ?? user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.display_name ?? user.username}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      Keine neuen Nutzer gefunden
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Settings tab (admins only) ─────────────────────── */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {!isAdmin ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nur Admins können die Gruppeneinstellungen bearbeiten.
                </p>
              ) : (
                <>
                  {settingsError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {settingsError}
                    </div>
                  )}
                  {settingsSuccess && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                      {settingsSuccess}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-group-name" className="text-xs">
                      Gruppenname
                    </Label>
                    <Input
                      id="edit-group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="h-8 text-sm bg-muted/30"
                      placeholder="Gruppenname…"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-group-avatar" className="text-xs flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Profilbild URL
                    </Label>
                    <Input
                      id="edit-group-avatar"
                      type="url"
                      value={groupAvatarUrl}
                      onChange={(e) => setGroupAvatarUrl(e.target.value)}
                      className="h-8 text-sm bg-muted/30"
                      placeholder="https://example.com/bild.png"
                    />
                    {groupAvatarUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={groupAvatarUrl}
                          alt="Vorschau"
                          className="h-10 w-10 rounded-full object-cover border border-border/50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Vorschau</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-8 text-sm"
                    onClick={handleSaveSettings}
                    disabled={isPending || !groupName.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-2" />
                    )}
                    Änderungen speichern
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
