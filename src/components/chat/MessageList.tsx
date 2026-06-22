"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileAttachment } from "@/components/chat/FileAttachment";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
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
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 h-full min-h-0 w-full px-4 py-4">
      <div className="space-y-4">
        {messages.map((message, idx) => {
          const isOwn = message.sender_id === currentUserId;
          const senderName =
            message.profiles?.display_name ??
            message.profiles?.username ??
            "Unbekannt";
          const prevMessage = messages[idx - 1];
          const isSameAuthorAsPrev =
            prevMessage?.sender_id === message.sender_id;

          return (
            <div
              key={message.id}
              id={`message-${message.id}`}
              className={cn(
                "flex items-end gap-2",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar – nur anzeigen wenn Autorwechsel */}
              <div className="w-8 shrink-0">
                {!isSameAuthorAsPrev && (
                  <Avatar className="h-8 w-8">
                    {message.profiles?.avatar_url ? (
                      <AvatarImage
                        src={message.profiles.avatar_url}
                        alt={senderName}
                      />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        "text-xs font-semibold",
                        isOwn
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[70%]",
                  isOwn ? "items-end" : "items-start"
                )}
              >
                {!isSameAuthorAsPrev && !isOwn && (
                  <span className="text-xs text-muted-foreground px-1">
                    {senderName}
                  </span>
                )}
                {message.file_url && (
                  <FileAttachment
                    fileUrl={message.file_url}
                    fileName={message.file_name ?? "Datei"}
                    fileType={message.file_type ?? "application/octet-stream"}
                    fileSize={message.file_size ?? 0}
                  />
                )}
                {message.content && (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
                      isOwn
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted/60 text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}