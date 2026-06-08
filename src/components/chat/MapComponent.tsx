"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";

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

interface MapComponentProps {
  locations: LocationData[];
  currentUserId: string;
  focusedUserId: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MapComponent({
  locations,
  currentUserId,
  focusedUserId,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track marker instances: user_id -> { marker: L.Marker, circle: L.Circle }
  const markersMapRef = useRef<Map<string, { marker: L.Marker; circle: L.Circle | null }>>(new Map());

  // Dynamic Leaflet import and Map setup
  useEffect(() => {
    let isCancelled = false;
    let mapInstance: L.Map | null = null;
    let LInstance: typeof L | null = null;

    const initMap = async () => {
      if (!containerRef.current) return;

      // Import leaflet dynamically
      const leaflet = await import("leaflet");
      
      // If effect is already cleaned up, abort initialization
      if (isCancelled) return;
      
      // Check if container already has a Leaflet ID to prevent double init
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        return;
      }

      LInstance = leaflet;

      // Fix icon issues in NextJS if default markers are ever used
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Default center in Germany
      const defaultCenter: [number, number] = [51.1657, 10.4515];
      const defaultZoom = 6;

      // Check if current user location exists to center map initially
      const currentUserLoc = locations.find((l) => l.user_id === currentUserId);
      const initialCenter = currentUserLoc 
        ? [currentUserLoc.latitude, currentUserLoc.longitude] as [number, number] 
        : defaultCenter;
      const initialZoom = currentUserLoc ? 14 : defaultZoom;

      // Initialize map
      mapInstance = leaflet.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = mapInstance;

      // Add CartoDB Dark Matter tile layer
      leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(mapInstance);

      // Force resize on load to avoid broken tiles
      setTimeout(() => {
        if (!isCancelled) {
          mapInstance?.invalidateSize();
        }
      }, 200);
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers on locations changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // We need standard leaflet library loaded at this point (already loaded in first useEffect)
    import("leaflet").then((L) => {
      const activeIds = new Set(locations.map((loc) => loc.user_id));

      // 1. Remove markers for users who stopped sharing
      markersMapRef.current.forEach((value, userId) => {
        if (!activeIds.has(userId)) {
          value.marker.remove();
          value.circle?.remove();
          markersMapRef.current.delete(userId);
        }
      });

      // 2. Add or update markers for currently sharing users
      locations.forEach((loc) => {
        const latLng: [number, number] = [loc.latitude, loc.longitude];
        const displayName = loc.profiles?.display_name ?? loc.profiles?.username ?? "Unbekannt";
        const initials = getInitials(displayName);
        const isOwn = loc.user_id === currentUserId;

        // Custom HTML Icon
        const avatarHtml = loc.profiles?.avatar_url 
          ? `<img src="${loc.profiles.avatar_url}" alt="${displayName}" class="w-full h-full object-cover rounded-full" />`
          : `<span>${initials}</span>`;

        // Pulse and style matches primary theme color
        const icon = L.divIcon({
          className: "live-marker",
          html: `
            <div class="live-marker-pulse"></div>
            <div class="live-marker-avatar shadow-lg border-2 ${isOwn ? 'border-emerald-500' : 'border-violet-500'} bg-card text-foreground">
              ${avatarHtml}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const existing = markersMapRef.current.get(loc.user_id);

        if (existing) {
          // Update position
          existing.marker.setLatLng(latLng);
          
          // Update Accuracy Circle if available
          if (loc.accuracy) {
            if (existing.circle) {
              existing.circle.setLatLng(latLng);
              existing.circle.setRadius(loc.accuracy);
            } else {
              const circle = L.circle(latLng, {
                radius: loc.accuracy,
                color: isOwn ? "var(--color-emerald-500)" : "var(--color-violet-500)",
                fillColor: isOwn ? "var(--color-emerald-500)" : "var(--color-violet-500)",
                fillOpacity: 0.08,
                weight: 1,
              }).addTo(map);
              existing.circle = circle;
            }
          } else if (existing.circle) {
            existing.circle.remove();
            existing.circle = null;
          }
        } else {
          // Create new marker
          const marker = L.marker(latLng, { icon }).addTo(map);

          // Add popup
          const timeStr = new Date(loc.updated_at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          
          let popupContent = `
            <div class="space-y-1 select-none">
              <p class="font-semibold text-sm text-foreground">${displayName}</p>
              <p class="text-xs text-muted-foreground">@${loc.profiles?.username ?? "username"}</p>
              <p class="text-[10px] text-muted-foreground mt-1">Zuletzt aktualisiert: ${timeStr}</p>
              ${loc.accuracy ? `<p class="text-[10px] text-muted-foreground">Genauigkeit: ${Math.round(loc.accuracy)}m</p>` : ""}
            </div>
          `;
          
          marker.bindPopup(popupContent);

          // Create Accuracy Circle
          let circle: L.Circle | null = null;
          if (loc.accuracy) {
            circle = L.circle(latLng, {
              radius: loc.accuracy,
              color: isOwn ? "#10b981" : "#8b5cf6", // Emerald or Violet
              fillColor: isOwn ? "#10b981" : "#8b5cf6",
              fillOpacity: 0.08,
              weight: 1,
            }).addTo(map);
          }

          markersMapRef.current.set(loc.user_id, { marker, circle });
        }
      });

      // Fit bounds if there are markers and it's the first render or markers count changed
      if (locations.length > 0 && !focusedUserId) {
        // Only fit bounds if map isn't zoomed in manually too far yet
        const bounds = L.latLngBounds(locations.map((loc) => [loc.latitude, loc.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [locations, currentUserId]);

  // Center map on focused user
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedUserId) return;

    const userLoc = locations.find((l) => l.user_id === focusedUserId);
    if (userLoc) {
      map.setView([userLoc.latitude, userLoc.longitude], 16, {
        animate: true,
        duration: 1.0,
      });

      // Open popup of focused user marker
      const markerData = markersMapRef.current.get(focusedUserId);
      if (markerData) {
        markerData.marker.openPopup();
      }
    }
  }, [focusedUserId, locations]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border/40 shadow-inner bg-muted/10">
      <div ref={containerRef} className="w-full h-full z-10" />
    </div>
  );
}
