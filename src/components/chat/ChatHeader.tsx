"use client";

import { ArrowLeft, Users, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatHeaderProps {
  chatName: string;
  isGroup: boolean;
  memberCount: number;
  chatId: string;
}

export function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  chatId,
}: ChatHeaderProps) {
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
        <h1 className="text-sm font-semibold truncate">{chatName}</h1>
        <p className="text-xs text-muted-foreground">
          {isGroup ? `${memberCount} Mitglieder` : "Direktnachricht"}
        </p>
      </div>

      <Badge variant="outline" className="text-xs font-mono shrink-0 opacity-50">
        #{chatId.slice(0, 8)}
      </Badge>
    </header>
  );
}
