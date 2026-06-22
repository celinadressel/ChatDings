"use client";

import { useEffect, useState } from "react";
import { FileText, Download, X } from "lucide-react";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = fileType.startsWith("image/");

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from("chat-files")
      .createSignedUrl(fileUrl, 60 * 60) // 1 hour validity
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [fileUrl]);

  if (isImage) {
    return (
      <>
        {signedUrl ? (
          /* No max-h — image stays natural aspect ratio, parent chat wrapper handles scrollbar */
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block cursor-zoom-in rounded-xl overflow-hidden max-w-[320px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <img
              src={signedUrl}
              alt={fileName}
              className="w-full h-auto rounded-xl"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="h-48 w-64 rounded-xl bg-muted animate-pulse" />
        )}

        {/* Lightbox for fullscreen preview */}
        {lightboxOpen && signedUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={fileName}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={signedUrl}
              alt={fileName}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
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
        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
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