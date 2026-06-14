"use client";

import { useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/validations";

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (type.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
  if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function MessageInput({ chatId, currentUserId }: MessageInputProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow selecting the same file again
    e.target.value = "";

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(`Datei zu groß – maximal ${formatBytes(MAX_FILE_SIZE)} erlaubt`);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      setError("Dieser Dateityp wird nicht unterstützt");
      return;
    }

    setError(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  function removeFile() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedFile(null);
    setImagePreview(null);
    setError(null);
  }

  async function handleSend() {
    const content = textareaRef.current?.value.trim() ?? "";
    if (!content && !selectedFile) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("chat_id", chatId);
      formData.set("content", content);

      if (selectedFile) {
        const supabase = createClient();

        // Eindeutiger Pfad: {chat_id}/{user_id}/{uuid}.{ext}
        const ext = selectedFile.name.includes(".")
          ? selectedFile.name.split(".").pop()
          : "bin";
        const storagePath = `${chatId}/${currentUserId}/${crypto.randomUUID()}.${ext}`;

        const { data: uploaded, error: uploadErr } = await supabase.storage
          .from("chat-attachments")
          .upload(storagePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr || !uploaded) {
          setError(`Upload fehlgeschlagen: ${uploadErr?.message ?? "Unbekannter Fehler"}`);
          return;
        }

        formData.set("file_url", uploaded.path);
        formData.set("file_name", selectedFile.name);
        formData.set("file_type", selectedFile.type);
        formData.set("file_size", String(selectedFile.size));
      }

      const result = await sendMessage(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Alles zurücksetzen
      if (textareaRef.current) textareaRef.current.value = "";
      removeFile();
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border/50 bg-card/30 px-4 py-3 space-y-2">
      {/* Datei-Vorschau */}
      {selectedFile && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
          {imagePreview ? (
            /* Bildvorschau */
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt={selectedFile.name}
                className="max-h-40 max-w-[200px] rounded-xl object-cover shadow-sm border border-border/40"
              />
              <button
                onClick={removeFile}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border/60 shadow-sm text-muted-foreground hover:text-destructive transition-colors"
                title="Datei entfernen"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                {selectedFile.name}
              </span>
            </div>
          ) : (
            /* Sonstige Datei */
            <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/40 px-3 py-2 max-w-xs">
              <span className="text-muted-foreground shrink-0">
                <FileTypeIcon type={selectedFile.type} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{selectedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={removeFile}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                title="Datei entfernen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fehlerhinweis */}
      {error && (
        <p className="text-xs text-destructive px-1 animate-in fade-in duration-150">
          {error}
        </p>
      )}

      {/* Eingabezeile */}
      <div className="flex items-end gap-2">
        {/* Verstecktes File-Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
        />

        {/* Anhang-Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground transition-colors",
            selectedFile && "text-primary hover:text-primary"
          )}
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          title="Datei anhängen"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

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

        {/* Senden-Button */}
        <Button
          type="button"
          size="icon"
          disabled={isPending}
          onClick={handleSend}
          id="send-message-button"
          className="shrink-0 h-10 w-10"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}