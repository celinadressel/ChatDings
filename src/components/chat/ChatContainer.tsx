"use client";

import { useState, useEffect, useRef } from "react";
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
  profiles: {
    username: string;
    display_name: string | null;
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
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_sharing: boolean;
  expires_at: string | null;
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
  const memberIds = members.map((m) => m.user_id);

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

  const watchId = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
            .select("username, display_name")
            .eq("id", newMsg.sender_id)
            .single();

          const formattedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            sender_id: newMsg.sender_id,
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

  // 2. Fetch and Subscribe to active member locations
  useEffect(() => {
    const loadLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("*, profiles(*)")
        .in("user_id", memberIds);

      if (data) {
        // Filter out expired locations locally
        const now = new Date();
        const activeLocs = (data as any[]).filter((loc) => {
          if (!loc.is_sharing) return false;
          if (loc.expires_at && new Date(loc.expires_at) <= now) return false;
          return true;
        });
        setLocations(activeLocs);

        // Check if current user is already sharing based on loaded data
        const currentUserLoc = activeLocs.find((loc) => loc.user_id === currentUserId);
        if (currentUserLoc) {
          setIsSharing(true);
          setExpiresAt(currentUserLoc.expires_at);
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
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newLoc = payload.new as any;
            if (memberIds.includes(newLoc.user_id)) {
              const now = new Date();
              const isExpired = newLoc.expires_at && new Date(newLoc.expires_at) <= now;

              if (!newLoc.is_sharing || isExpired) {
                setLocations((prev) => prev.filter((l) => l.user_id !== newLoc.user_id));
                if (newLoc.user_id === currentUserId) {
                  stopSharingLocally();
                }
              } else {
                setLocations((prev) => {
                  const filtered = prev.filter((l) => l.user_id !== newLoc.user_id);
                  const member = members.find((m) => m.user_id === newLoc.user_id);
                  const profile = member ? member.profiles : null;
                  return [...filtered, { ...newLoc, profiles: profile }];
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldLoc = payload.old as any;
            setLocations((prev) => prev.filter((l) => l.user_id !== oldLoc.user_id));
            if (oldLoc.user_id === currentUserId) {
              stopSharingLocally();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [chatId, currentUserId, supabase]);

  // Helper function to stop local watch states without DB queries
  const stopSharingLocally = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsSharing(false);
    setExpiresAt(null);
    setTimeRemaining(null);
  };

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

  // Unmount cleanup to stop sharing
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

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

    const handlePositionUpdate = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Double check client side expiry
      if (expiryTime && new Date() > new Date(expiryTime)) {
        stopSharing();
        return;
      }

      await supabase.from("locations").upsert({
        user_id: currentUserId,
        latitude,
        longitude,
        accuracy,
        is_sharing: true,
        expires_at: expiryTime,
        updated_at: new Date().toISOString(),
      });
    };

    const handlePositionError = (error: GeolocationPositionError) => {
      console.error("Standortfehler:", error.message);
      alert(`Fehler beim Laden des Standorts: ${error.message}. Bitte überprüfe deine GPS-Berechtigungen.`);
      stopSharingLocally();
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
  };

  // 5. Stop Live Location Sharing
  const stopSharing = async () => {
    stopSharingLocally();
    await supabase.from("locations").delete().eq("user_id", currentUserId);
  };

  const activeSharersCount = locations.length;
  const isAnyoneSharing = activeSharersCount > 0;

  return (
    <div className="flex-1 flex flex-row min-w-0 h-full overflow-hidden relative">
      {/* LEFT PANEL: Chat Messages & Input */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full min-w-0 transition-all duration-300",
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
          <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
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
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    Du teilst deinen Standort live
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      {timeRemaining}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Mitglieder dieses Chats sehen dich jetzt auf der Karte. Dein Standort wird automatisch aktualisiert.
                </p>
                <Button
                  onClick={stopSharing}
                  variant="destructive"
                  className="w-full text-xs h-9 rounded-lg"
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
                  className="w-full text-xs h-9 rounded-lg"
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
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isOwn ? "bg-emerald-500" : "bg-violet-500"
                          )} />
                          <span className="font-medium truncate text-foreground">
                            {name} {isOwn && "(Du)"}
                          </span>
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
