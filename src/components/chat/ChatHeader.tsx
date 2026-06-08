"use client";

import { ArrowLeft, Users, User, Map, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatHeaderProps {
  chatName: string;
  isGroup: boolean;
  memberCount: number;
  chatId: string;
  onToggleMap?: () => void;
  isMapOpen?: boolean;
  isSharingActive?: boolean;
  activeSharersCount?: number;
}

export function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  chatId,
  onToggleMap,
  isMapOpen = false,
  isSharingActive = false,
  activeSharersCount = 0,
}: ChatHeaderProps) {
  const isAnyoneSharing = activeSharersCount > 0;

  return (
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
  );
}
