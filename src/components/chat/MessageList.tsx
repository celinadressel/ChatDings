"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Download,
} from "lucide-react";

export interface Message {
  id: string;
  content: string | null;
  created_at: string;
  sender_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  signed_url?: string | null; // vom Server generiert (1h gültig)
  profiles: {
    username: string;
    display_name: string | null;
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

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string | null }) {
  if (!type) return <File className="h-5 w-5" />;
  if (type.startsWith("image/")) return <FileImage className="h-5 w-5" />;
  if (type.startsWith("video/")) return <FileVideo className="h-5 w-5" />;
  if (type.startsWith("audio/")) return <FileAudio className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function FileAttachment({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const isImage = message.file_type?.startsWith("image/");
  const hasUrl = !!message.signed_url;

  if (isImage && hasUrl) {
    return (
      <a
        href={message.signed_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={message.file_name ?? "Bild öffnen"}
      >
        <img
          src={message.signed_url!}
          alt={message.file_name ?? "Bild"}
          className="max-w-[280px] max-h-64 rounded-xl object-cover shadow-sm cursor-pointer hover:opacity-90 transition-opacity border border-border/20"
        />
      </a>
    );
  }

  // Datei-Download-Karte
  return (
    <a
      href={hasUrl ? message.signed_url! : undefined}
      download={message.file_name ?? "download"}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!hasUrl}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 max-w-[280px] transition-colors",
        isOwn
          ? "bg-primary/90 border-primary/30 hover:bg-primary text-primary-foreground"
          : "bg-muted/60 border-border/40 hover:bg-muted/80 text-foreground",
        !hasUrl && "opacity-60 pointer-events-none"
      )}
    >
      <span
        className={cn(
          "shrink-0",
          isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        <FileTypeIcon type={message.file_type} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {message.file_name ?? "Datei"}
        </p>
        <p
          className={cn(
            "text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatBytes(message.file_size)}
        </p>
      </div>
      <Download
        className={cn(
          "h-4 w-4 shrink-0",
          isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      />
    </a>
  );
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Noch keine Nachrichten. Schreib etwas!
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-4">
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
          const hasFile = !!message.file_url;
          const hasContent = !!(message.content?.trim());

          return (
            <div
              key={message.id}
              id={`message-${message.id}`}
              className={cn(
                "flex items-end gap-2",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar – nur bei Autorwechsel */}
              <div className="w-8 shrink-0">
                {!isSameAuthorAsPrev && (
                  <Avatar className="h-8 w-8">
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

              {/* Nachrichteninhalt */}
              <div
                className={cn(
                  "flex flex-col gap-1.5 max-w-[70%]",
                  isOwn ? "items-end" : "items-start"
                )}
              >
                {/* Absendername (nur bei Autorwechsel + fremde Nachrichten) */}
                {!isSameAuthorAsPrev && !isOwn && (
                  <span className="text-xs text-muted-foreground px-1">
                    {senderName}
                  </span>
                )}

                {/* Dateianhang */}
                {hasFile && (
                  <FileAttachment message={message} isOwn={isOwn} />
                )}

                {/* Textinhalt */}
                {hasContent && (
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