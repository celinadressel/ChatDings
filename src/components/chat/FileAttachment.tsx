"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export function FileAttachment({
  fileUrl,
  fileName,
  fileType,
  fileSize,
}: FileAttachmentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = fileType.startsWith("image/");

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("chat-files")
      .createSignedUrl(fileUrl, 60 * 60) // 1 Stunde gültig
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [fileUrl]);

  if (isImage) {
    return signedUrl ? (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={signedUrl}
          alt={fileName}
          className="max-w-xs max-h-64 rounded-xl object-cover"
        />
      </a>
    ) : (
      <div className="h-32 w-48 rounded-xl bg-muted animate-pulse" />
    );
  }

  return (
    <a
      href={signedUrl ?? "#"}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 max-w-xs hover:bg-muted/60 transition-colors"
    >
      <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(fileSize)}
        </p>
      </div>
      <Download className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
    </a>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}