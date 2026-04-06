// ============================================================
// NearbyBusesMap — Leaflet Map Component for BusConnect
// ============================================================
// Renders user location + nearby bus markers with real-time
// movement. Handles empty states, loading, and error display.
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyBus } from "../services/nearbyBusService";

// ─────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────

interface NearbyBusesMapProps {
    /** User's current GPS location */
    userLocation: [number, number] | null;
    /** List of nearby buses to display */
    buses: NearbyBus[];
    /** Current search radius in km */
    radiusKm: number;
    /** Callback when a bus marker is clicked */
    onBusClick?: (bus: NearbyBus) => void;
}

// ─────────────────────────────────────────────────
// MARKER HTML GENERATORS
// ─────────────────────────────────────────────────

const createUserMarkerHtml = (): string => `
<div style="position:relative;width:24px;height:24px">
  <span style="
    position:absolute;inset:0;border-radius:50%;
    background:#3b82f6;opacity:0.35;
    animation:nearbyPing 2s cubic-bezier(0,0,0.2,1) infinite;
  "></span>
  <span style="
    position:relative;display:block;width:24px;height:24px;
    border-radius:50%;background:#2563eb;
    border:3px solid white;
    box-shadow:0 2px 12px rgba(37,99,235,0.5);
  "></span>
</div>`;

const createBusMarkerHtml = (distanceKm: number): string => {
    // Color based on proximity
    const color =
        distanceKm <= 3
            ? "#22c55e"
            : distanceKm <= 7
            ? "#eab308"
            : distanceKm <= 12
            ? "#f97316"
            : "#ef4444";

    return `
<div style="
  background:white;border:2px solid ${color};
  border-radius:20px;padding:3px 8px;
  display:flex;align-items:center;gap:4px;
  box-shadow:0 3px 12px rgba(0,0,0,0.2);
  cursor:pointer;width:max-content;
  transition:transform 0.2s;
" onmouseenter="this.style.transform='scale(1.15)'"
   onmouseleave="this.style.transform='scale(1)'">
  <span style="font-size:14px;line-height:1">🚌</span>
  <span style="
    font-size:10px;font-weight:700;color:${color};
    letter-spacing:0.3px;
  ">${distanceKm.toFixed(1)}km</span>
</div>`;
};

const createBusPopupHtml = (bus: NearbyBus): string => {
    const ageLabel = bus.updatedAt
        ? `${Math.round(
              (Date.now() -
                  (bus.updatedAt as any).seconds * 1000) /
                  1000
          )}s ago`
        : "Unknown";

    return `
<div style="min-width:180px;font-family:system-ui,-apple-system,sans-serif">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
    <span style="font-size:20px">🚌</span>
    <div>
      <div style="font-weight:800;font-size:13px;color:#1e293b">
        Bus ${bus.busId}
      </div>
      <div style="font-size:10px;color:#64748b;font-weight:500">
        Driver: ${bus.driverId || "N/A"}
      </div>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-top:4px">
    <div style="
      flex:1;background:#f0fdf4;border-radius:8px;
      padding:6px 8px;text-align:center;
    ">
      <div style="font-size:9px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Distance</div>
      <div style="font-size:14px;font-weight:800;color:#15803d">${bus.distanceKm.toFixed(1)} km</div>
    </div>
    <div style="
      flex:1;background:#eff6ff;border-radius:8px;
      padding:6px 8px;text-align:center;
    ">
      <div style="font-size:9px;color:#2563eb;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Updated</div>
      <div style="font-size:14px;font-weight:800;color:#1d4ed8">${ageLabel}</div>
    </div>
  </div>
  <div style="
    margin-top:8px;font-size:9px;color:#94a3b8;
    text-align:center;font-weight:500;
  ">
    ${bus.latitude.toFixed(5)}, ${bus.longitude.toFixed(5)}
  </div>
</div>`;
};

// ─────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────

const NearbyBusesMap: React.FC<NearbyBusesMapProps> = ({
    userLocation,
    buses,
    radiusKm,
    onBusClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const radiusCircleRef = useRef<L.Circle | null>(null);
    const busLayerRef = useRef<L.LayerGroup | null>(null);
    const pulseLayerRef = useRef<L.LayerGroup | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // ── Initialize map ────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const defaultCenter: [number, number] = userLocation || [
            30.7333, 76.7794,
        ];

        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView(defaultCenter, 13);

        // Fix mobile rendering
        setTimeout(() => map.invalidateSize(), 300);

        // Tile layer
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            {
                attribution:
                    '&copy; <a href="https://carto.com/">CARTO</a>',
                maxZoom: 19,
            }
        ).addTo(map);

        // Attribution (bottom-right, minimal)
        L.control.attribution({ position: "bottomright" }).addTo(map);

        // Layer groups
        busLayerRef.current = L.layerGroup().addTo(map);
        pulseLayerRef.current = L.layerGroup().addTo(map);

        mapRef.current = map;

        return () => {
            if (animFrameRef.current)
                cancelAnimationFrame(animFrameRef.current);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update user location marker + radius circle ─
    useEffect(() => {
        if (!mapRef.current || !userLocation) return;

        const [lat, lng] = userLocation;

        // User marker
        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: "",
                html: createUserMarkerHtml(),
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
            userMarkerRef.current = L.marker([lat, lng], {
                icon,
                zIndexOffset: 2000,
            })
                .addTo(mapRef.current)
                .bindTooltip("Your Location", {
                    permanent: false,
                    direction: "top",
                    offset: [0, -14],
                    className: "nearby-user-tooltip",
                });
        }

        // Radius circle
        const radiusM = radiusKm * 1000;
        if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng([lat, lng]);
            radiusCircleRef.current.setRadius(radiusM);
        } else {
            radiusCircleRef.current = L.circle([lat, lng], {
                radius: radiusM,
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: "6, 4",
                interactive: false,
            }).addTo(mapRef.current);
        }

        // Pulse rings
        if (pulseLayerRef.current) {
            pulseLayerRef.current.clearLayers();
            [0.3, 0.6, 0.9].forEach((frac) => {
                L.circle([lat, lng], {
                    radius: radiusM * frac,
                    color: "#93c5fd",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.03,
                    weight: 0.5,
                    interactive: false,
                }).addTo(pulseLayerRef.current!);
            });
        }
    }, [userLocation, radiusKm]);

    // ── Update bus markers ─────────────────────────
    useEffect(() => {
        if (!mapRef.current || !busLayerRef.current) return;

        busLayerRef.current.clearLayers();

        buses.forEach((bus) => {
            const icon = L.divIcon({
                className: "",
                html: createBusMarkerHtml(bus.distanceKm),
                iconSize: [80, 28],
                iconAnchor: [40, 14],
                popupAnchor: [0, -14],
            });

            const marker = L.marker([bus.latitude, bus.longitude], {
                icon,
                zIndexOffset: 1000,
            })
                .bindPopup(createBusPopupHtml(bus), {
                    closeButton: false,
                    className: "nearby-bus-popup",
                    maxWidth: 220,
                })
                .addTo(busLayerRef.current!);

            if (onBusClick) {
                marker.on("click", () => onBusClick(bus));
            }
        });

        // Fit bounds to show user + all buses
        if (userLocation && buses.length > 0) {
            const bounds = L.latLngBounds([userLocation]);
            buses.forEach((b) => bounds.extend([b.latitude, b.longitude]));
            mapRef.current.fitBounds(bounds, {
                padding: [60, 60],
                maxZoom: 15,
                animate: true,
                duration: 0.6,
            });
        } else if (userLocation) {
            mapRef.current.setView(userLocation, 13, { animate: true });
        }
    }, [buses, userLocation, onBusClick]);

    return (
        <>
            <div
                ref={containerRef}
                className="w-full h-full absolute inset-0"
                style={{ zIndex: 0 }}
            />
            <style>{`
                @keyframes nearbyPing {
                    75%, 100% { transform: scale(2.5); opacity: 0; }
                }
                .nearby-user-tooltip {
                    background: rgba(15,23,42,0.92) !important;
                    color: white !important;
                    border: none !important;
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    padding: 4px 10px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                }
                .nearby-user-tooltip::before {
                    border-top-color: rgba(15,23,42,0.92) !important;
                }
                .nearby-bus-popup .leaflet-popup-content-wrapper {
                    border-radius: 14px !important;
                    box-shadow: 0 12px 32px -4px rgba(0,0,0,0.18) !important;
                    border: 1px solid rgba(0,0,0,0.06) !important;
                    padding: 0 !important;
                }
                .nearby-bus-popup .leaflet-popup-content {
                    margin: 14px 16px !important;
                }
                .nearby-bus-popup .leaflet-popup-tip {
                    box-shadow: 2px 2px 10px rgba(0,0,0,0.08) !important;
                }
                .nearby-bus-popup a.leaflet-popup-close-button {
                    display: none !important;
                }
            `}</style>
        </>
    );
};

export default NearbyBusesMap;
