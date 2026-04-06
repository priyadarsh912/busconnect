// ============================================================
// LiveRadarWrapper — Wraps existing Radar with Firestore buses
// ============================================================
// Renders the existing HighwayRadarPage and overlays live
// Firestore bus markers. Uses a Leaflet map tracker to capture
// the map instance created by the child page.
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import * as L from "leaflet";
import HighwayRadarPage from "../pages/HighwayRadarPage";
import { useFirestoreLiveBuses, type FirestoreLiveBus } from "../hooks/useFirestoreLiveBuses";

// ─────────────────────────────────────────────────
// GLOBAL MAP TRACKER
// ─────────────────────────────────────────────────
// Intercept L.Map creation to capture the map instance.
// This runs only once and stores all created maps.

const _allMaps: L.Map[] = [];
const _originalMapInit = L.Map.prototype.initialize;

if (!(L.Map.prototype as any).__liveTracked) {
    const origInit = L.Map.prototype.initialize;
    (L.Map.prototype as any).initialize = function (this: L.Map, ...args: any[]) {
        origInit.apply(this, args);
        _allMaps.push(this);
        // Cleanup on removal
        this.on("remove", () => {
            const idx = _allMaps.indexOf(this);
            if (idx !== -1) _allMaps.splice(idx, 1);
        });
    };
    (L.Map.prototype as any).__liveTracked = true;
}

const getLatestMap = (): L.Map | null => {
    return _allMaps.length > 0 ? _allMaps[_allMaps.length - 1] : null;
};

// ─────────────────────────────────────────────────
// MARKER HTML
// ─────────────────────────────────────────────────

const getAgeMs = (lastUpdated: any): number => {
    if (!lastUpdated) return Infinity;
    const ms = lastUpdated?.toMillis
        ? lastUpdated.toMillis()
        : lastUpdated?.seconds
        ? lastUpdated.seconds * 1000
        : typeof lastUpdated === "number"
        ? lastUpdated
        : 0;
    return ms > 0 ? Date.now() - ms : Infinity;
};

const createLiveMarkerHtml = (bus: FirestoreLiveBus): string => {
    const ageSec = Math.round(getAgeMs(bus.lastUpdated) / 1000);
    const ageLabel = ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`;
    const isRecent = ageSec < 30;
    const borderColor = isRecent ? "#22c55e" : "#f59e0b";

    return `
<div style="
  background:white;border:2.5px solid ${borderColor};
  border-radius:24px;padding:3px 10px;
  display:flex;align-items:center;gap:5px;
  box-shadow:0 4px 16px rgba(0,0,0,0.25);
  cursor:pointer;width:max-content;position:relative;
">
  <span style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;
    background:${isRecent ? '#22c55e' : '#f59e0b'};border:2px solid white;
    ${isRecent ? 'animation:livePulseRadar 1.5s ease infinite;' : ''}"></span>
  <span style="font-size:15px;line-height:1">🚌</span>
  <span style="font-size:9px;font-weight:800;color:#1e293b;letter-spacing:0.3px;text-transform:uppercase">LIVE</span>
  <span style="font-size:9px;font-weight:600;color:#64748b">${ageLabel}</span>
</div>`;
};

const createLivePopupHtml = (bus: FirestoreLiveBus): string => {
    const ageSec = Math.round(getAgeMs(bus.lastUpdated) / 1000);
    const ageLabel = ageSec < 5 ? "Just now" : ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

    return `
<div style="min-width:200px;font-family:system-ui,-apple-system,sans-serif">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <div style="width:36px;height:36px;border-radius:10px;
      background:linear-gradient(135deg,#3b82f6,#2563eb);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(37,99,235,0.3)">
      <span style="font-size:18px">🚌</span>
    </div>
    <div>
      <div style="font-weight:800;font-size:14px;color:#1e293b">${bus.busId}</div>
      <div style="font-size:10px;color:#64748b;font-weight:600">Driver: ${bus.driverId || "Active"}</div>
    </div>
    <div style="margin-left:auto;background:#dcfce7;color:#16a34a;
      font-size:9px;font-weight:800;padding:3px 8px;border-radius:20px;
      text-transform:uppercase;letter-spacing:0.5px">● LIVE</div>
  </div>
  <div style="display:flex;gap:6px;margin-bottom:8px">
    <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:8px;text-align:center">
      <div style="font-size:8px;color:#16a34a;font-weight:700;text-transform:uppercase">Distance</div>
      <div style="font-size:16px;font-weight:900;color:#15803d">${bus.distanceToUser.toFixed(1)}<span style="font-size:10px;font-weight:600"> km</span></div>
    </div>
    <div style="flex:1;background:#eff6ff;border-radius:10px;padding:8px;text-align:center">
      <div style="font-size:8px;color:#2563eb;font-weight:700;text-transform:uppercase">Updated</div>
      <div style="font-size:12px;font-weight:800;color:#1d4ed8;margin-top:2px">${ageLabel}</div>
    </div>
    <div style="flex:1;background:#faf5ff;border-radius:10px;padding:8px;text-align:center">
      <div style="font-size:8px;color:#7c3aed;font-weight:700;text-transform:uppercase">Speed</div>
      <div style="font-size:16px;font-weight:900;color:#6d28d9">${bus.speed || 0}<span style="font-size:10px;font-weight:600"> km/h</span></div>
    </div>
  </div>
  <div style="font-size:9px;color:#94a3b8;text-align:center;font-weight:500;padding-top:6px;border-top:1px solid #f1f5f9">
    📍 ${bus.latitude.toFixed(5)}, ${bus.longitude.toFixed(5)}
  </div>
</div>`;
};

// ─────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────

const LiveRadarWrapper = () => {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const liveLayerRef = useRef<L.LayerGroup | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => setUserLocation([30.7333, 76.7794]),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setUserLocation([30.7333, 76.7794]);
        }
    }, []);

    // Fetch live buses from Firestore
    const { liveBuses } = useFirestoreLiveBuses(userLocation, {
        maxRadiusKm: 50,
        maxAgeSec: 300,
    });

    // Update markers whenever liveBuses change
    const updateMarkers = useCallback((map: L.Map, buses: FirestoreLiveBus[]) => {
        if (!liveLayerRef.current) {
            liveLayerRef.current = L.layerGroup().addTo(map);
        }

        liveLayerRef.current.clearLayers();

        buses.forEach((bus) => {
            const icon = L.divIcon({
                className: "",
                html: createLiveMarkerHtml(bus),
                iconSize: [110, 30],
                iconAnchor: [55, 15],
                popupAnchor: [0, -18],
            });

            L.marker([bus.latitude, bus.longitude], {
                icon,
                zIndexOffset: 5000,
            })
                .bindPopup(createLivePopupHtml(bus), {
                    closeButton: false,
                    maxWidth: 250,
                })
                .addTo(liveLayerRef.current!);
        });
    }, []);

    // Poll for the map instance, then update markers
    useEffect(() => {
        const tryUpdate = () => {
            // Try to reuse existing ref
            if (mapRef.current) {
                try {
                    // Verify map is still valid
                    mapRef.current.getCenter();
                    updateMarkers(mapRef.current, liveBuses);
                    return true;
                } catch {
                    mapRef.current = null;
                    liveLayerRef.current = null;
                }
            }

            // Find the map via our tracker
            const map = getLatestMap();
            if (map) {
                mapRef.current = map;
                updateMarkers(map, liveBuses);
                return true;
            }

            return false;
        };

        // Try immediately
        if (!tryUpdate()) {
            // Poll every 300ms for up to 15 seconds
            let attempts = 0;
            pollRef.current = setInterval(() => {
                attempts++;
                if (tryUpdate() || attempts >= 50) {
                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            }, 300);
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [liveBuses, updateMarkers]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (liveLayerRef.current) {
                liveLayerRef.current.clearLayers();
                liveLayerRef.current = null;
            }
            mapRef.current = null;
        };
    }, []);

    return (
        <>
            <HighwayRadarPage />

            {/* Floating live bus indicator */}
            {liveBuses.length > 0 && (
                <div id="live-bus-count-badge" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[2000]">
                    <div
                        className="bg-green-600 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5"
                        style={{
                            animation: "liveRadarFadeIn 0.5s ease-out",
                            boxShadow: "0 8px 32px rgba(22, 163, 74, 0.4)",
                        }}
                    >
                        <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold tracking-wide">
                            {liveBuses.length} Live Bus{liveBuses.length !== 1 ? "es" : ""} Detected
                        </span>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes livePulseRadar {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.8); opacity: 0.4; }
                }
                @keyframes liveRadarFadeIn {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </>
    );
};

export default LiveRadarWrapper;
