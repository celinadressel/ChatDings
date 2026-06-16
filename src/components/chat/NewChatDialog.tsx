"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDirectChat, createGroupChat } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Loader2,
  MessageSquare,
  Users,
  X,
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

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
}

export function NewChatDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dm" | "group">("dm");
  
  // DM State
  const [dmQuery, setDmQuery] = useState("");
  const [dmResults, setDmResults] = useState<UserResult[]>([]);
  const [isSearchingDm, setIsSearchingDm] = useState(false);
  
  // Group State
  const [groupName, setGroupName] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [isSearchingGroup, setIsSearchingGroup] = useState(false);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSearchDm(value: string) {
    setDmQuery(value);
    if (value.length < 2) {
      setDmResults([]);
      return;
    }

    setIsSearchingDm(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.ilike.%${value}%,display_name.ilike.%${value}%`)
      .limit(8);

    setDmResults(data ?? []);
    setIsSearchingDm(false);
  }

  async function handleSearchGroup(value: string) {
    setGroupQuery(value);
    if (value.length < 2) {
      setGroupResults([]);
      return;
    }

    setIsSearchingGroup(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.ilike.%${value}%,display_name.ilike.%${value}%`)
      .limit(8);

    setGroupResults(data ?? []);
    setIsSearchingGroup(false);
  }

  function handleSelectDmUser(userId: string) {
    startTransition(async () => {
      const result = await createDirectChat(userId);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.chat_id) {
        handleClose();
        router.push(`/chat/${result.chat_id}`);
      }
    });
  }

  function handleAddGroupUser(user: UserResult) {
    if (selectedUsers.some((u) => u.id === user.id)) return;
    setSelectedUsers([...selectedUsers, user]);
    setGroupQuery("");
    setGroupResults([]);
  }

  function handleRemoveGroupUser(userId: string) {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  }

  function handleCreateGroup() {
    if (!groupName.trim()) {
      alert("Bitte gib einen Gruppennamen ein.");
      return;
    }
    if (selectedUsers.length === 0) {
      alert("Bitte wähle mindestens ein Mitglied aus.");
      return;
    }

    startTransition(async () => {
      const result = await createGroupChat({
        name: groupName,
        member_ids: selectedUsers.map((u) => u.id),
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      if (result.chat_id) {
        handleClose();
        router.push(`/chat/${result.chat_id}`);
      }
    });
  }

  function handleClose() {
    setOpen(false);
    setActiveTab("dm");
    setDmQuery("");
    setDmResults([]);
    setGroupName("");
    setGroupQuery("");
    setGroupResults([]);
    setSelectedUsers([]);
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80"
        onClick={() => setOpen(true)}
        id="new-chat-button"
        title="Neuen Chat starten"
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl p-5 space-y-4 transition-all animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Neuer Messenger-Chat</h2>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-1 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("dm")}
            className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === "dm"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Direktnachricht
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === "group"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Gruppe erstellen
          </button>
        </div>

        {/* --- DM Tab Content --- */}
        {activeTab === "dm" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-search-dm">Nutzer suchen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search-dm"
                  placeholder="Name oder @Nutzername…"
                  className="pl-9 bg-muted/30"
                  value={dmQuery}
                  onChange={(e) => handleSearchDm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {isSearchingDm && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {dmResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {dmResults.map((user) => (
                  <button
                    key={user.id}
                    id={`select-user-${user.id}`}
                    onClick={() => handleSelectDmUser(user.id)}
                    disabled={isPending}
                    className="flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs font-semibold">
                        {getInitials(user.display_name ?? user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.display_name ?? user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    {isPending && (
                      <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {dmQuery.length >= 2 && !isSearchingDm && dmResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Keine Nutzer gefunden
              </p>
            )}
          </div>
        )}

        {/* --- Group Tab Content --- */}
        {activeTab === "group" && (
          <div className="space-y-4">
            {/* Group Name input */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Gruppenname</Label>
              <Input
                id="group-name"
                placeholder="z.B. Lerngruppe Info..."
                className="bg-muted/30"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Selected Users Pills */}
            {selectedUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Ausgewählte Mitglieder ({selectedUsers.length})</Label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-muted/20 border border-border/30 rounded-xl">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1.5 bg-primary/10 text-primary-foreground border border-primary/20 pl-2 pr-1.5 py-0.5 rounded-full text-xs font-medium"
                    >
                      <span className="truncate max-w-[120px] text-foreground">
                        {user.display_name ?? user.username}
                      </span>
                      <button
                        onClick={() => handleRemoveGroupUser(user.id)}
                        className="hover:bg-primary/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search users to add */}
            <div className="space-y-2">
              <Label htmlFor="user-search-group">Mitglieder hinzufügen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search-group"
                  placeholder="Name oder @Nutzername…"
                  className="pl-9 bg-muted/30"
                  value={groupQuery}
                  onChange={(e) => handleSearchGroup(e.target.value)}
                />
              </div>
            </div>

            {isSearchingGroup && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}

            {/* Group search results */}
            {groupResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {groupResults.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleAddGroupUser(user)}
                      disabled={isSelected}
                      className="flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left hover:bg-muted/60 transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs font-semibold">
                          {getInitials(user.display_name ?? user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {user.display_name ?? user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {groupQuery.length >= 2 && !isSearchingGroup && groupResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Keine Nutzer gefunden
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={isPending || !groupName.trim() || selectedUsers.length === 0}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Gruppe erstellen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
