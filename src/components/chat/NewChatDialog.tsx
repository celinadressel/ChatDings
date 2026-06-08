"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDirectChat } from "@/lib/actions/chat";
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.ilike.%${value}%,display_name.ilike.%${value}%`)
      .limit(8);

    setResults(data ?? []);
    setIsSearching(false);
  }

  function handleSelectUser(userId: string) {
    startTransition(async () => {
      const result = await createDirectChat(userId);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.chat_id) {
        setOpen(false);
        setQuery("");
        setResults([]);
        router.push(`/chat/${result.chat_id}`);
      }
    });
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
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
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card shadow-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Neuen Chat starten</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-search">Nutzer suchen</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="user-search"
              placeholder="Name oder @Nutzername…"
              className="pl-9 bg-muted/30"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {isSearching && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {results.map((user) => (
              <button
                key={user.id}
                id={`select-user-${user.id}`}
                onClick={() => handleSelectUser(user.id)}
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

        {query.length >= 2 && !isSearching && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            Keine Nutzer gefunden
          </p>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setQuery("");
              setResults([]);
            }}
            id="close-new-chat"
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
