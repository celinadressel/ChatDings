"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Map as MapIcon, 
  Navigation, 
  Clock, 
  X, 
  Compass, 
  ChevronRight, 
  StopCircle,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

// Load MapComponent dynamically without SSR
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 gap-3">
      <Compass className="h-8 w-8 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground font-medium animate-pulse">Karte wird geladen…</span>
    </div>
  )
});

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Member {
  user_id: string;
  role: "admin" | "member";
  profiles: Profile | null;
}

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

interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
}

interface ChatContainerProps {
  chatId: string;
  chat: Chat;
  initialMessages: Message[];
  members: Member[];
  currentUserId: string;
  chatDisplayName: string;
}

interface LocationData {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_sharing: boolean;
  expires_at: string | null;
  chat_id: string | null;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ChatContainer({
  chatId,
  chat,
  initialMessages,
  members,
  currentUserId,
  chatDisplayName,
}: ChatContainerProps) {
  const supabase = createClient();
  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);

  // Realtime messages state
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Map toggle state
  const [showMap, setShowMap] = useState<boolean>(false);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);

  // Geolocation & sharing state
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(60); // Default 1 hour in minutes
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [shareWithAll, setShareWithAll] = useState<boolean>(false);

  const watchId = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shareWithAllRef = useRef<boolean>(false);
  const lastPositionRef = useRef<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);

  const isMounted = useRef<boolean>(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  useEffect(() => {
    shareWithAllRef.current = shareWithAll;
  }, [shareWithAll]);

  // Resize listener to detect desktop vs mobile layout
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Subscribe to real-time message updates
  useEffect(() => {
    const messageChannel = supabase
      .channel(`chat-messages:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.is_deleted) return;

          // Fetch sender profile info
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          const formattedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            sender_id: newMsg.sender_id,
            file_url: newMsg.file_url ?? null,
            file_name: newMsg.file_name ?? null,
            file_type: newMsg.file_type ?? null,
            file_size: newMsg.file_size ?? null,
            profiles: profile,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === formattedMsg.id)) return prev;
            return [...prev, formattedMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [chatId, supabase]);

  // Helper function to stop local watch states without DB queries
  const stopSharingLocally = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (isMounted.current) {
      setIsSharing(false);
      setExpiresAt(null);
      setTimeRemaining(null);
    }
  }, []);

  const stopSharing = useCallback(async () => {
    console.log("stopSharing triggered");
    stopSharingLocally();
    try {
      let res;
      if (shareWithAll) {
        res = await supabase.from("locations").delete().eq("user_id", currentUserId).is("chat_id", null);
      } else {
        res = await supabase.from("locations").delete().eq("user_id", currentUserId).eq("chat_id", chatId);
      }
      if (res.error) {
        console.error("Error deleting location row from DB:", res.error);
      } else {
        console.log("Location successfully deleted from DB.");
      }
    } catch (err) {
      console.error("Unexpected error in stopSharing:", err);
    }
  }, [currentUserId, chatId, shareWithAll, stopSharingLocally, supabase]);

  const startWatching = useCallback((expiryTime: string | null, forceShareWithAll?: boolean) => {
    if (!isMounted.current) return;
    if (watchId.current !== null) return; // Already watching

    const handlePositionUpdate = async (position: GeolocationPosition) => {
      // Abort if the watch has been stopped or component unmounted in the meantime
      if (!isMounted.current || watchId.current === null) return;

      const { latitude, longitude, accuracy } = position.coords;
      lastPositionRef.current = { latitude, longitude, accuracy };

      // Double check client side expiry
      if (expiryTime && new Date() > new Date(expiryTime)) {
        stopSharing();
        return;
      }

      const currentShareWithAll = forceShareWithAll !== undefined ? forceShareWithAll : shareWithAllRef.current;

      if (!isMounted.current || watchId.current === null) return;

      // 1. Ensure/upsert the row for this specific chat context exists in the DB
      const resUpsert = await supabase.from("locations").upsert({
        user_id: currentUserId,
        latitude,
        longitude,
        accuracy,
        is_sharing: true,
        expires_at: expiryTime,
        chat_id: currentShareWithAll ? null : chatId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,chat_id" });

      if (resUpsert.error) {
        console.error(
          "Error upserting current location:",
          resUpsert.error.message,
          "Code:", resUpsert.error.code,
          "Details:", resUpsert.error.details
        );
      }

      if (!isMounted.current || watchId.current === null) return;

      // 2. Propagate new coordinates to all active shares of the user
      const resUpdate = await supabase.from("locations")
        .update({
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", currentUserId);

      if (resUpdate.error) {
        console.error(
          "Error propagating location updates to other chats:",
          resUpdate.error.message,
          "Code:", resUpdate.error.code,
          "Details:", resUpdate.error.details
        );
      }
    };

    const handlePositionError = (error: GeolocationPositionError) => {
      console.error("Standortfehler:", error.message);
      if (error.code === error.PERMISSION_DENIED) {
        alert("GPS-Berechtigungen wurden verweigert. Standortfreigabe beendet.");
        stopSharing();
      }
    };

    // Begin tracking
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handlePositionError, {
      enableHighAccuracy: true,
    });

    watchId.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [chatId, currentUserId, stopSharing, supabase]);

  // 2. Fetch and Subscribe to active member locations
  useEffect(() => {
    const loadLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("*, profiles(*)")
        .or(`chat_id.eq.${chatId},chat_id.is.null`)
        .in("user_id", memberIds);

      if (!isMounted.current) return;

      if (data) {
        // Filter out expired locations locally
        const now = new Date();
        const activeLocs = (data as any[]).filter((loc) => {
          if (!loc.is_sharing) return false;
          if (loc.expires_at && new Date(loc.expires_at) <= now) return false;
          return true;
        });

        // Deduplicate activeLocs by user_id, prioritizing chat-specific entries over global ones
        const uniqueLocs: LocationData[] = [];
        const seenUsers = new Set<string>();
        const sortedLocs = [...activeLocs].sort((a, b) => {
          if (a.chat_id && !b.chat_id) return -1;
          if (!a.chat_id && b.chat_id) return 1;
          return 0;
        });

        for (const loc of sortedLocs) {
          if (!seenUsers.has(loc.user_id)) {
            seenUsers.add(loc.user_id);
            uniqueLocs.push(loc);
          }
        }
        
        if (isMounted.current) {
          setLocations(uniqueLocs);

          // Check if current user is already sharing based on loaded data
          const currentUserLoc = uniqueLocs.find((loc) => loc.user_id === currentUserId);
          if (currentUserLoc && isMounted.current) {
            const isGlobal = currentUserLoc.chat_id === null;
            setIsSharing(true);
            setExpiresAt(currentUserLoc.expires_at);
            setShareWithAll(isGlobal);
            shareWithAllRef.current = isGlobal; // Sync ref immediately
            // Auto-resume watching in the background
            startWatching(currentUserLoc.expires_at, isGlobal);
          }
        }
      }
    };

    loadLocations();

    const locationChannel = supabase
      .channel(`chat-locations:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "locations",
        },
        (payload) => {
          if (!isMounted.current) return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newLoc = payload.new as any;
            if (memberIds.includes(newLoc.user_id)) {
              const now = new Date();
              const isExpired = newLoc.expires_at && new Date(newLoc.expires_at) <= now;
              const isSharedWithThisChat = newLoc.chat_id === chatId || newLoc.chat_id === null;

              if (!newLoc.is_sharing || isExpired || !isSharedWithThisChat) {
                setLocations((prev) => prev.filter((l) => l.id !== newLoc.id));
                if (newLoc.user_id === currentUserId) {
                  const isForThisChat = newLoc.chat_id === chatId || (newLoc.chat_id === null && shareWithAll);
                  if (isForThisChat) {
                    stopSharingLocally();
                  }
                }
              } else {
                setLocations((prev) => {
                  const filtered = prev.filter((l) => l.id !== newLoc.id);
                  const member = members.find((m) => m.user_id === newLoc.user_id);
                  const profile = member ? member.profiles : null;
                  const newEntry = { ...newLoc, profiles: profile };
                  
                  // Combine and deduplicate by user_id, prioritizing chat-specific
                  const combined = [...filtered, newEntry];
                  const uniqueList: LocationData[] = [];
                  const seen = new Set<string>();
                  const sorted = combined.sort((a, b) => {
                    if (a.chat_id && !b.chat_id) return -1;
                    if (!a.chat_id && b.chat_id) return 1;
                    return 0;
                  });
                  for (const loc of sorted) {
                    if (!seen.has(loc.user_id)) {
                      seen.add(loc.user_id);
                      uniqueList.push(loc);
                    }
                  }
                  return uniqueList;
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldLoc = payload.old as any;
            setLocations((prev) => {
              const deletedLoc = prev.find((l) => l.id === oldLoc.id);
              if (deletedLoc && deletedLoc.user_id === currentUserId) {
                stopSharingLocally();
              }
              return prev.filter((l) => l.id !== oldLoc.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [chatId, currentUserId, memberIds, members, startWatching, stopSharingLocally, supabase, shareWithAll]);

  // 3. Periodic cleanups of expired locations & remaining time calculations
  useEffect(() => {
    const checkExpirations = () => {
      const now = new Date();

      // Clean up others locations
      setLocations((prev) => {
        const active = prev.filter((loc) => {
          if (loc.expires_at && new Date(loc.expires_at) <= now) {
            return false;
          }
          return true;
        });
        return active.length !== prev.length ? active : prev;
      });

      // Handle current user expiration
      if (isSharing && expiresAt) {
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();

        if (diffMs <= 0) {
          stopSharing();
        } else {
          // Format remaining time
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setTimeRemaining(
            `${diffMins}:${diffSecs.toString().padStart(2, "0")} Min.`
          );
        }
      } else {
        setTimeRemaining(null);
      }
    };

    checkExpirations(); // Run immediately
    timerRef.current = setInterval(checkExpirations, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSharing, expiresAt]);

  // Unmount cleanup is handled in the mounting lifecycle useEffect above

  // 4. Start Live Location Sharing
  const startSharing = async () => {
    if (!navigator.geolocation) {
      alert("Geolokalisierung wird von diesem Browser nicht unterstützt.");
      return;
    }

    let expiryTime: string | null = null;
    if (duration !== null) {
      const date = new Date();
      date.setMinutes(date.getMinutes() + duration);
      expiryTime = date.toISOString();
    }

    setIsSharing(true);
    setExpiresAt(expiryTime);
    startWatching(expiryTime, shareWithAll);
  };

  const handleToggleShareWithAll = async (newValue: boolean) => {
    setShareWithAll(newValue);
    if (isSharing && lastPositionRef.current) {
      const { latitude, longitude, accuracy } = lastPositionRef.current;
      if (newValue) {
        // Switching to global: delete chat-specific share and upsert global share
        await supabase.from("locations").delete().eq("user_id", currentUserId).eq("chat_id", chatId);
        await supabase.from("locations").upsert({
          user_id: currentUserId,
          latitude,
          longitude,
          accuracy,
          is_sharing: true,
          expires_at: expiresAt,
          chat_id: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,chat_id" });
      } else {
        // Switching to chat-specific: delete global share and upsert chat-specific share
        await supabase.from("locations").delete().eq("user_id", currentUserId).is("chat_id", null);
        await supabase.from("locations").upsert({
          user_id: currentUserId,
          latitude,
          longitude,
          accuracy,
          is_sharing: true,
          expires_at: expiresAt,
          chat_id: chatId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,chat_id" });
      }
    }
  };

  const activeSharersCount = locations.length;
  const isAnyoneSharing = activeSharersCount > 0;

return (
    <div className="flex-1 flex flex-row min-w-0 h-full overflow-hidden relative">
      {/* LEFT PANEL: Chat Messages & Input */}
      <div
        className={cn(
          // FIX: min-h-0 hinzugefügt, um das unendliche Mitwachsen durch große Bilder zu verhindern
          "flex-1 flex flex-col h-full min-w-0 min-h-0 transition-all duration-300",
          showMap && !isDesktop && "hidden" // Hide chat on mobile when map is open
        )}
      >
        <ChatHeader
          chatName={chatDisplayName}
          isGroup={chat.is_group}
          memberCount={members.length}
          chatId={chatId}
          onToggleMap={() => setShowMap(!showMap)}
          isMapOpen={showMap}
          isSharingActive={isSharing}
          activeSharersCount={activeSharersCount}
        />
        <MessageList messages={messages} currentUserId={currentUserId} />
        <MessageInput chatId={chatId} />
      </div>

      {/* RIGHT PANEL: Live Map Dashboard */}
      {showMap && (
        <div
          className={cn(
            "border-l border-border/50 bg-card/20 backdrop-blur-md h-full flex flex-col transition-all duration-300 animate-in slide-in-from-right",
            isDesktop ? "w-[420px] lg:w-[500px]" : "flex-1"
          )}
        >
          {/* Dashboard Header */}
          <div className="flex h-[60px] items-center justify-between px-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Live-Standorte</span>
              {isAnyoneSharing && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setShowMap(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Map Container */}
          <div className="flex-1 min-h-[300px] relative p-2">
            <MapComponent
              key={chatId}
              locations={locations}
              currentUserId={currentUserId}
              focusedUserId={focusedUserId}
            />
          </div>

          {/* Sharing Controls Dashboard */}
          <div className="p-4 border-t border-border/50 bg-card/40 backdrop-blur-sm space-y-4 shrink-0">
            {isSharing ? (
              <div className={cn(
                "rounded-xl border p-3.5 space-y-3 transition-all duration-300",
                shareWithAll 
                  ? "border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                  : "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    shareWithAll ? "text-cyan-400" : "text-emerald-400"
                  )}>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        shareWithAll ? "bg-cyan-400" : "bg-emerald-400"
                      )}></span>
                      <span className={cn(
                        "relative inline-flex rounded-full h-2.5 w-2.5",
                        shareWithAll ? "bg-cyan-500" : "bg-emerald-500"
                      )}></span>
                    </span>
                    {shareWithAll ? "Standort mit allen Kontakten geteilt" : "Du teilst deinen Standort live (nur dieser Chat)"}
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      {timeRemaining}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  {shareWithAll 
                    ? "Alle deine Chat-Kontakte können dich jetzt auf der Karte sehen. Dein Standort wird automatisch aktualisiert."
                    : "Mitglieder dieses Chats sehen dich jetzt auf der Karte. Dein Standort wird automatisch aktualisiert."}
                </p>

                {/* Scoped Sharing Toggle when Active */}
                <div className="flex items-center justify-between pt-2 border-t border-border/10">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-foreground">Mit allen Kontakten teilen</span>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      Gibt deinen Standort für all deine Kontakte frei.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleShareWithAll(!shareWithAll)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      shareWithAll ? "bg-cyan-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                        shareWithAll ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <Button
                  onClick={stopSharing}
                  variant="destructive"
                  className="w-full text-xs h-9 rounded-lg mt-1"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Teilen beenden
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Eigener Standort</p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Gib deinen Live-Standort frei, damit andere Chat-Mitglieder sehen können, wo du bist.
                  </p>
                </div>

                {/* Scoped Sharing Toggle when Inactive */}
                <div className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300",
                  shareWithAll 
                    ? "border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.03)]" 
                    : "border-border/50 bg-background/40"
                )}>
                  <div className="space-y-0.5 max-w-[70%]">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Compass className={cn("h-3.5 w-3.5", shareWithAll ? "text-cyan-400 animate-spin-slow" : "text-muted-foreground")} />
                      Mit allen Kontakten teilen
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Gibt deinen Standort für alle Kontakte frei, statt nur in diesem Chat.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareWithAll(!shareWithAll)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      shareWithAll ? "bg-cyan-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                        shareWithAll ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-1">Teilen-Dauer</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "15 Min.", val: 15 },
                      { label: "1 Std.", val: 60 },
                      { label: "8 Std.", val: 480 },
                      { label: "Immer", val: null }
                    ].map((opt) => (
                      <Button
                        key={opt.label}
                        type="button"
                        variant={duration === opt.val ? "default" : "outline"}
                        className="text-xs h-8 px-0 rounded-md transition-all"
                        onClick={() => setDuration(opt.val)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={startSharing}
                  className={cn(
                    "w-full text-xs h-9 rounded-lg transition-all",
                    shareWithAll 
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/20" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Live-Standort teilen
                </Button>
              </div>
            )}

            {/* List of active members sharing location */}
            {isAnyoneSharing && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground px-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Derzeit auf der Karte ({activeSharersCount})
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {locations.map((loc) => {
                    const isOwn = loc.user_id === currentUserId;
                    const name = loc.profiles?.display_name ?? loc.profiles?.username ?? "Mitglied";
                    const isFocused = focusedUserId === loc.user_id;
                    const isGlobal = loc.chat_id === null;

                    let circleBg = "bg-violet-500";
                    if (isGlobal) {
                      circleBg = isOwn ? "bg-cyan-500" : "bg-indigo-500";
                    } else {
                      circleBg = isOwn ? "bg-emerald-500" : "bg-violet-500";
                    }

                    return (
                      <button
                        key={loc.user_id}
                        onClick={() => setFocusedUserId(loc.user_id === focusedUserId ? null : loc.user_id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all hover:bg-muted/50 border border-transparent",
                          isFocused && "bg-primary/10 border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", circleBg)} />
                          <span className="font-medium truncate text-foreground">
                            {name} {isOwn && "(Du)"}
                          </span>
                          {isGlobal ? (
                            <span className="text-[9px] scale-90 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 font-normal">
                              Global
                            </span>
                          ) : (
                            <span className="text-[9px] scale-90 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-normal">
                              Chat
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 font-mono">
                          Fokus
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}