"use client";

import { useRef, useTransition } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  chatId: string;
}

export function MessageInput({ chatId }: MessageInputProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await sendMessage(formData);
      formRef.current?.reset();
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const formData = new FormData(formRef.current!);
      handleSubmit(formData);
    }
  }

  return (
    <div className="border-t border-border/50 bg-card/30 px-4 py-3">
      <form ref={formRef} action={handleSubmit} className="flex items-end gap-2">
        <input type="hidden" name="chat_id" value={chatId} />
        <Textarea
          ref={textareaRef}
          name="content"
          id="message-input"
          placeholder="Nachricht schreiben… (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
          className="min-h-10 max-h-32 resize-none bg-muted/30 text-sm flex-1"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isPending}
          id="send-message-button"
          className="shrink-0 h-10 w-10"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
