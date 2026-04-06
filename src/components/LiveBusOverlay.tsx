// ============================================================
// LiveBusOverlay — Renders real-time Firestore bus markers
// ============================================================
// This component is a transparent overlay that adds live bus
// markers from Firestore on top of any Leaflet map. It finds
// the existing map instance in the DOM and adds markers to it.
// ============================================================

import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FirestoreLiveBus } from "../hooks/useFirestoreLiveBuses";

interface LiveBusOverlayProps {
    buses: FirestoreLiveBus[];
    mapInstance: L.Map | null;
}

const createLiveMarkerHtml = (bus: FirestoreLiveBus): string => {
    const ageMs = bus.lastUpdated
        ? Date.now() -
          (bus.lastUpdated.toMillis
              ? bus.lastUpdated.toMillis()
              : bus.lastUpdated.seconds
              ? bus.lastUpdated.seconds * 1000
              : 0)
        : 0;
    const ageSec = Math.round(ageMs / 1000);
    const ageLabel = ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`;
    const isRecent = ageSec < 30;
    const borderColor = isRecent ? "#22c55e" : "#f59e0b";

    return `
<div style="
  background:white;border:2.5px solid ${borderColor};
  border-radius:24px;padding:3px 10px;
  display:flex;align-items:center;gap:5px;
  box-shadow:0 4px 16px rgba(0,0,0,0.25);
  cursor:pointer;width:max-content;
  position:relative;
">
  <span style="
    position:absolute;top:-3px;right:-3px;
    width:10px;height:10px;border-radius:50%;
    background:${isRecent ? '#22c55e' : '#f59e0b'};
    border:2px solid white;
    ${isRecent ? 'animation:livePulse 1.5s ease infinite;' : ''}
  "></span>
  <span style="font-size:15px;line-height:1">🚌</span>
  <span style="
    font-size:9px;font-weight:800;color:#1e293b;
    letter-spacing:0.3px;text-transform:uppercase;
  ">LIVE</span>
  <span style="
    font-size:9px;font-weight:600;color:#64748b;
  ">${ageLabel}</span>
</div>`;
};

const createLivePopupHtml = (bus: FirestoreLiveBus): string => {
    const ageMs = bus.lastUpdated
        ? Date.now() -
          (bus.lastUpdated.toMillis
              ? bus.lastUpdated.toMillis()
              : bus.lastUpdated.seconds
              ? bus.lastUpdated.seconds * 1000
              : 0)
        : 0;
    const ageSec = Math.round(ageMs / 1000);
    const ageLabel = ageSec < 5 ? "Just now" : ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

    return `
<div style="min-width:200px;font-family:system-ui,-apple-system,sans-serif">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <div style="
      width:36px;height:36px;border-radius:10px;
      background:linear-gradient(135deg,#3b82f6,#2563eb);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(37,99,235,0.3);
    ">
      <span style="font-size:18px">🚌</span>
    </div>
    <div>
      <div style="font-weight:800;font-size:14px;color:#1e293b">
        ${bus.busId}
      </div>
      <div style="font-size:10px;color:#64748b;font-weight:600">
        Driver: ${bus.driverId || "Active"}
      </div>
    </div>
    <div style="
      margin-left:auto;background:#dcfce7;color:#16a34a;
      font-size:9px;font-weight:800;padding:3px 8px;
      border-radius:20px;text-transform:uppercase;
      letter-spacing:0.5px;
    ">● LIVE</div>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:8px">
    <div style="
      flex:1;background:#f0fdf4;border-radius:10px;
      padding:8px;text-align:center;
    ">
      <div style="font-size:8px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Distance</div>
      <div style="font-size:16px;font-weight:900;color:#15803d">${bus.distanceToUser.toFixed(1)}<span style="font-size:10px;font-weight:600"> km</span></div>
    </div>
    <div style="
      flex:1;background:#eff6ff;border-radius:10px;
      padding:8px;text-align:center;
    ">
      <div style="font-size:8px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Updated</div>
      <div style="font-size:12px;font-weight:800;color:#1d4ed8;margin-top:2px">${ageLabel}</div>
    </div>
    <div style="
      flex:1;background:#faf5ff;border-radius:10px;
      padding:8px;text-align:center;
    ">
      <div style="font-size:8px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Speed</div>
      <div style="font-size:16px;font-weight:900;color:#6d28d9">${bus.speed || 0}<span style="font-size:10px;font-weight:600"> km/h</span></div>
    </div>
  </div>

  <div style="
    font-size:9px;color:#94a3b8;text-align:center;
    font-weight:500;padding-top:6px;border-top:1px solid #f1f5f9;
  ">
    📍 ${bus.latitude.toFixed(5)}, ${bus.longitude.toFixed(5)}
  </div>
</div>`;
};

const LiveBusOverlay: React.FC<LiveBusOverlayProps> = ({ buses, mapInstance }) => {
    const layerRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!mapInstance) return;

        // Create layer group if not exists
        if (!layerRef.current) {
            layerRef.current = L.layerGroup().addTo(mapInstance);
        }

        // Clear old markers
        layerRef.current.clearLayers();

        // Add live bus markers
        buses.forEach((bus) => {
            const icon = L.divIcon({
                className: "",
                html: createLiveMarkerHtml(bus),
                iconSize: [100, 30],
                iconAnchor: [50, 15],
                popupAnchor: [0, -18],
            });

            L.marker([bus.latitude, bus.longitude], {
                icon,
                zIndexOffset: 5000, // Always on top of simulated markers
            })
                .bindPopup(createLivePopupHtml(bus), {
                    closeButton: false,
                    maxWidth: 250,
                    className: "live-bus-popup",
                })
                .addTo(layerRef.current!);
        });

        // Cleanup on unmount
        return () => {
            if (layerRef.current) {
                layerRef.current.clearLayers();
            }
        };
    }, [buses, mapInstance]);

    return (
        <style>{`
            @keyframes livePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.8); opacity: 0.4; }
            }
            .live-bus-popup .leaflet-popup-content-wrapper {
                border-radius: 16px !important;
                box-shadow: 0 16px 40px -8px rgba(0,0,0,0.2) !important;
                border: 1px solid rgba(0,0,0,0.05) !important;
                padding: 0 !important;
            }
            .live-bus-popup .leaflet-popup-content {
                margin: 14px 16px !important;
            }
            .live-bus-popup .leaflet-popup-tip {
                box-shadow: 2px 2px 10px rgba(0,0,0,0.08) !important;
            }
            .live-bus-popup a.leaflet-popup-close-button {
                display: none !important;
            }
        `}</style>
    );
};

export default LiveBusOverlay;
