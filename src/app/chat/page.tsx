import { MessageSquare } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Kein Chat ausgewählt</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Wähle einen Chat aus der Seitenleiste aus oder starte eine neue
          Unterhaltung.
        </p>
      </div>
    </div>
  );
}
