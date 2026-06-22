"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendFileMessage } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function FileUploadButton({ chatId }: { chatId: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("Datei darf maximal 20 MB groß sein");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();

    try {
      // FIX: Authenticate and refresh stale browser tokens explicitly prior to storage uploads
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sitzung abgelaufen. Bitte laden Sie die Seite neu.");
      }

      const ext = file.name.split(".").pop();
      const path = `${chatId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      
      if (uploadError) throw uploadError;

      const result = await sendFileMessage({
        chat_id: chatId,
        file_url: path, // Private bucket pointer path
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
      });

      if (result.error) alert(result.error);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Datei konnte nicht hochgeladen werden");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,text/plain,.pdf,.doc,.docx,.zip"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
}