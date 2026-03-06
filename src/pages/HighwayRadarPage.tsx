import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Search, Loader2, MapPin, Bus, ChevronDown, ChevronUp, ArrowDownUp, Users, X, Radar as RadarIcon, Clock } from "lucide-react";
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from "framer-motion";
import { format, addMinutes } from "date-fns";
import PageShell from "@/components/PageShell";
import * as XLSX from 'xlsx';
import { useRadarBuses } from "@/hooks/useRadarBuses";
import { RadarBus, loadRadarBuses } from "@/utils/RadarLoader";

// --- Types ---
type EnrichedRoute = RadarBus & {
    crowdLevel: string;
    seatProbability: number;
    etaMinutes: number;
    departureTime: Date;
    arrivalTime: Date;
    fare: number;
};

// Aliases for compatibility
type BusRoute = RadarBus;
type CrowdLevel = string;

type ConnectingRoute = {
    segment1: EnrichedRoute;
    segment2: EnrichedRoute;
    totalTime: number;
    totalFare: number;
    transferWait: number;
    transferStop: string;
};

// --- City & Stop Coordinates ---
const CITY_COORDS: Record<string, [number, number]> = {
    // Cities
    "Chandigarh": [30.7333, 76.7794],
    "Mohali": [30.7046, 76.7179],
    "Ropar": [30.9639, 76.5267],
    "Ludhiana": [30.9000, 75.8573],
    "Amritsar": [31.6340, 74.8723],
    "Jalandhar": [31.3260, 75.5762],
    "Patiala": [30.3398, 76.3869],
    "Bathinda": [30.2110, 74.9455],
    "Hoshiarpur": [31.5143, 75.9115],
    "Pathankot": [32.2643, 75.6522],
    "Ferozepur": [30.9235, 74.6148],
    "Moga": [30.8178, 75.1699],
    "Kapurthala": [31.3808, 75.3800],

    // Sectors (Chandigarh)
    "Sector 10": [30.7587, 76.7865],
    "Sector 15": [30.7533, 76.7725],
    "Sector 17": [30.7398, 76.7827],
    "Sector 20": [30.7214, 76.7876],
    "Sector 22": [30.7363, 76.7699],
    "Sector 34": [30.7188, 76.7645],
    "Sector 35": [30.7285, 76.7562],
    "Sector 37": [30.7395, 76.7450],
    "Sector 43 Bus Stand": [30.7250, 76.7460],
    "IT Park": [30.7265, 76.8407],

    // Phases (Mohali)
    "Phase 1": [30.7300, 76.7118],
    "Phase 2": [30.7248, 76.7126],
    "Phase 3": [30.7186, 76.7145],
    "Phase 4": [30.7161, 76.7196],
    "Phase 5": [30.7214, 76.7267],
    "Phase 6": [30.7335, 76.7179],
    "Phase 7": [30.7230, 76.7328],
    "Phase 8": [30.7180, 76.7340],
    "Phase 9": [30.6970, 76.7400],
    "Phase 11": [30.6865, 76.7470]
};

const CITY_NAMES = Object.keys(CITY_COORDS);

// --- Helpers ---
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
const hashStr = (s: string): number => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getCrowdLevel = (distance: number): CrowdLevel => {
    if (distance < 100) return "High";
    if (distance < 200) return "Moderate";
    return "Low";
};

const getSeatProbability = (id: string, crowd: string): number => {
    const base = crowd === "Low" ? 75 : crowd === "Moderate" ? 45 : 15;
    return Math.min(99, base + (hashStr(id) % 20));
};

const crowdColor = (c: CrowdLevel) =>
    c === "Low" ? "#22c55e" : c === "Moderate" ? "#eab308" : "#ef4444";

const crowdBg = (c: string) =>
    c === "Low" ? "bg-green-100 text-green-700" : c === "Moderate" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

const crowdTextColor = (c: CrowdLevel) =>
    c === "Low" ? "#16a34a" : c === "Moderate" ? "#ca8a04" : "#dc2626";

// Removed parseCSV for Intercity data

const renderBusMarkerHtml = (color: string) => `
<div style="background:white;border:2px solid ${color};border-radius:20px;padding:2px 6px;display:flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;width:max-content">
  <span style="font-size:12px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.1))">🚌</span>
</div>`;

const renderBusPopupHtml = (busId: string, operator: string, to: string, highway: string, etaMinutes: number, crowdLevel: string, color: string, textCol: string) => {
    let opColor = "#1e293b";
    let opBg = "#f1f5f9";
    let opEmoji = "🚌";

    if (operator === "Punjab Roadways") {
        opColor = "#1e3a8a"; opBg = "#dbeafe"; opEmoji = "🔵";
    } else if (operator === "Haryana Roadways") {
        opColor = "#9a3412"; opBg = "#ffedd5"; opEmoji = "🟠";
    } else if (operator === "PRTC") {
        opColor = "#14532d"; opBg = "#dcfce7"; opEmoji = "🟢";
    } else if (operator === "Private Volvo") {
        opColor = "#334155"; opBg = "#f1f5f9"; opEmoji = "⚪";
    }

    return `
<div style="min-width: 160px;">
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
      <span style="font-weight:800;font-size:10px;color:${opColor};background:${opBg};padding:2px 6px;border-radius:4px;text-transform:uppercase">${opEmoji} ${operator}</span>
      <span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;border:1px solid #e2e8f0;text-transform:uppercase">${highway}</span>
    </div>
    <div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
       To ${to}
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <span style="color:#16a34a;font-weight:700;font-size:11px;display:flex;align-items:center;gap:3px">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ETA ${etaMinutes}m
        </span>
        <span style="width:4px;height:4px;border-radius:50%;background:#cbd5e1"></span>
        <span style="color:${textCol};font-weight:600;font-size:11px">${crowdLevel} Crowd</span>
    </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:12px">
        <button id="track-btn-${busId}" style="flex:1;background:#3b82f6;color:white;border:none;padding:6px 0;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;transition:opacity 0.2s" onmousedown="setTimeout(()=>this.style.opacity=0.7,0)" onmouseup="setTimeout(()=>this.style.opacity=1,200)">Track Bus</button>
        ${operator !== "Private Volvo" ? `<button id="book-btn-${busId}" style="flex:1;background:white;color:#3b82f6;border:1px solid #3b82f6;padding:6px 0;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;transition:background 0.2s" onmousedown="setTimeout(()=>this.style.background='#eff6ff',0)" onmouseup="setTimeout(()=>this.style.background='white',200)">Book Ticket</button>` : ''}
    </div>
</div>
`;
};

// --- Component ---
const HighwayRadarPage = () => {
    const navigate = useNavigate();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markerLayerGroup = useRef<L.LayerGroup | null>(null);
    const routeLineGroup = useRef<L.LayerGroup | null>(null);
    const radarLayerGroup = useRef<L.LayerGroup | null>(null);
    const radarCircleRef = useRef<L.Circle | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const allRoutesRef = useRef<BusRoute[]>([]);
    const userCoordsRef = useRef<[number, number]>([30.7333, 76.7794]);

    const [isLoading, setIsLoading] = useState(true);

    // --- Radar Hook ---
    const { nearbyBuses, isLoading: isRadarLoading, lastRefresh } = useRadarBuses(userCoordsRef.current);

    // Init map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const fallback: [number, number] = [30.7333, 76.7794];
        userCoordsRef.current = fallback;
        const m = L.map(mapContainer.current, { zoomControl: false }).setView(fallback, 10);
        map.current = m;

        markerLayerGroup.current = L.layerGroup().addTo(m);
        routeLineGroup.current = L.layerGroup().addTo(m);
        radarLayerGroup.current = L.layerGroup().addTo(m);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(m);

        // User marker
        const userIcon = L.divIcon({
            className: '',
            html: `<div style="position:relative;width:22px;height:22px">
               <span style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></span>
               <span style="position:relative;display:block;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.5)"></span>
             </div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        });
        userMarkerRef.current = L.marker(fallback, { icon: userIcon, zIndexOffset: 1000 })
            .addTo(m)
            .bindTooltip("You", { permanent: true, direction: "top", offset: [0, -12], className: "user-tooltip" });

        radarCircleRef.current = L.circle(fallback, {
            radius: 35000,
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 0.08,
            weight: 1,
            interactive: false
        }).addTo(m);

        startRadarPulse(fallback);

        // Check and GPS on load
        const requestLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                        userCoordsRef.current = coords;
                        m.flyTo(coords, 12, { duration: 1.5 });
                        userMarkerRef.current?.setLatLng(coords);
                        radarCircleRef.current?.setLatLng(coords);
                        startRadarPulse(coords);
                    },
                    (err) => {
                        console.warn("Location error:", err);
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            }
        };

        // Try to check permission status first (if supported)
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'granted') {
                    requestLocation();
                } else if (result.state === 'prompt') {
                    // Browsers usually block prompts on load unless there's user interaction.
                    // We'll try anyway, but the button is the main trigger.
                    requestLocation();
                }
                result.onchange = () => {
                    if (result.state === 'granted') requestLocation();
                };
            }).catch(() => requestLocation());
        } else {
            requestLocation();
        }

        return () => {
            if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
            m.remove();
            map.current = null;
        };
    }, []);

    // Load Outstation Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const routes = await loadRadarBuses();
                // Map to old format for internal state if needed, but RadarBus is now the base
                const mappedRoutes = routes.map(r => ({
                    ...r,
                    routeNo: r.route_id,
                    busNo: r.operator,
                    from: r.start_stop,
                    to: r.end_stop,
                    distance: r.distance_km,
                    time: r.eta_min,
                    fare: r.price_inr
                }));
                allRoutesRef.current = mappedRoutes as any;

                setIsLoading(false);
            } catch (err) {
                console.error("Data load failed:", err);
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // ── Draw nearby buses (from hook) ─────────────────────────────
    useEffect(() => {
        if (!markerLayerGroup.current || nearbyBuses.length === 0 || !map.current) return;

        markerLayerGroup.current.clearLayers();
        routeLineGroup.current?.clearLayers();

        nearbyBuses.forEach((bus: any) => {
            const operator = bus.operator;
            const routeNo = bus.route_id;
            const to = bus.end_stop;
            const crowd = bus.crowd;
            const eta = bus.eta_min;
            const color = crowdColor(crowd as any);
            const textCol = crowdTextColor(crowd as any);

            // Draw full road path polyline
            if (bus.full_polyline) {
                L.polyline(bus.full_polyline, {
                    color: color,
                    weight: 3,
                    opacity: 0.3,
                    dashArray: '5, 10'
                }).addTo(routeLineGroup.current!);
            }

            const busIcon = L.divIcon({
                className: '',
                html: renderBusMarkerHtml(color),
                iconSize: [30, 24],
                iconAnchor: [15, 12],
                popupAnchor: [0, -10]
            });

            const marker = L.marker([bus.current_lat || bus.start_lat, bus.current_lon || bus.start_lon], {
                icon: busIcon,
                zIndexOffset: 1000
            }).bindPopup(
                renderBusPopupHtml(bus.route_id, operator, to, bus.highway, eta, crowd, color, textCol),
                {
                    closeButton: false,
                    className: 'custom-bus-popup' // customized via CSS below
                }
            );

            marker.addTo(markerLayerGroup.current!);

            // Handle actions when popup opens
            marker.on('popupopen', () => {
                // Highlight route
                if (bus.full_polyline) {
                    L.polyline(bus.full_polyline, {
                        color: color,
                        weight: 6,
                        opacity: 0.8
                    }).addTo(routeLineGroup.current!);
                }

                // Bind Track Bus button
                const trackBtn = document.getElementById(`track-btn-${bus.route_id}`);
                if (trackBtn) {
                    trackBtn.onclick = () => {
                        toast.success(`Bus arriving in ${eta} mins`, { description: "Walk to nearest stop to board", duration: 4000 });
                        const clickedRoute: EnrichedRoute = {
                            ...bus,
                            crowdLevel: crowd,
                            etaMinutes: eta,
                            seatProbability: getSeatProbability(bus.route_id, crowd),
                            departureTime: addMinutes(new Date(), -10),
                            arrivalTime: addMinutes(new Date(), eta),
                            fare: bus.price_inr,
                        };
                        navigate('/tracking', { state: { route: clickedRoute, tripType: "outstation" } });
                    };
                }

                // Bind Book Ticket button
                const bookBtn = document.getElementById(`book-btn-${bus.route_id}`);
                if (bookBtn) {
                    bookBtn.onclick = () => {
                        navigate("/book-ticket", {
                            state: {
                                route_id: bus.route_id,
                                operator: bus.operator,
                                origin: bus.start_stop,
                                destination: bus.end_stop,
                                next_stop: bus.stop_1 || bus.end_stop,
                                eta: bus.eta_min,
                                distance_km: bus.distance_km,
                                price: bus.price_inr,
                                bus_type: "Outstation AC"
                            }
                        });
                    };
                }
            });

            marker.on('popupclose', () => {
                routeLineGroup.current?.clearLayers();
            });
        });
    }, [nearbyBuses, navigate]);


    const startRadarPulse = useCallback((coords: [number, number]) => {
        if (!radarLayerGroup.current) return;
        if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
        radarLayerGroup.current.clearLayers();

        // Multiple concentric rings
        const rings = [1500, 3500, 6000];
        rings.forEach(radius => {
            L.circle(coords, {
                radius,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.04,
                weight: 1,
                opacity: 0.3,
            }).addTo(radarLayerGroup.current!);
        });

        // Animated sweep
        const sweep = L.circle(coords, {
            radius: 1000,
            color: '#60a5fa',
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
            weight: 2,
        }).addTo(radarLayerGroup.current);

        let r = 1000;
        pulseIntervalRef.current = setInterval(() => {
            r += 120;
            if (r > 7000) r = 1000;
            sweep.setRadius(r);
            sweep.setStyle({ fillOpacity: 0.1 * (1 - (r - 1000) / 6000), opacity: 0.5 * (1 - (r - 1000) / 6000) });
        }, 50);

    }, []);


    return (
        <PageShell noPadding>
            <div className="relative w-full h-full min-h-screen bg-background overflow-hidden">
                {/* Map */}
                <div ref={mapContainer} className="absolute inset-0 z-0" />

                {/* CSS for tooltips */}
                <style>{`
          .user-tooltip {
            background: rgba(15,23,42,0.9) !important;
            color: white !important;
            border: none !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            padding: 4px 10px !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
          }
          .user-tooltip::before { border-top-color: rgba(15,23,42,0.9) !important; }
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          /* Map popups */
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2) !important;
            border: 1px solid rgba(0,0,0,0.05) !important;
            padding: 0 !important;
          }
          .leaflet-popup-content {
            margin: 12px 14px !important;
          }
          .leaflet-container a.leaflet-popup-close-button {
            display: none !important;
          }
          .leaflet-popup-tip {
             box-shadow: 2px 2px 10px rgba(0,0,0,0.1) !important;
          }
        `}</style>

                {/* Top: Header & Discovery Title */}
                <div className="absolute left-0 right-0 z-[1000] pointer-events-none" style={{ top: '10px' }}>
                    <div className="max-w-md mx-auto px-4">
                        {/* Navigation Row */}
                        <div className="flex items-center justify-between mb-4 pointer-events-auto">
                            <Link to="/" className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all text-neutral-800 border border-neutral-100">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>

                            <div className="flex-1 text-center px-4">
                                <h1 className="text-xl font-black text-neutral-900 tracking-tight leading-none">Highway Radar</h1>
                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-1">Nearby long-distance buses</p>
                            </div>

                            <button
                                onClick={() => {
                                    if (!navigator.geolocation) { alert("Location not supported."); return; }
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                                        userCoordsRef.current = coords;
                                        map.current?.flyTo(coords, 13);
                                        userMarkerRef.current?.setLatLng(coords);
                                        radarCircleRef.current?.setLatLng(coords);
                                        startRadarPulse(coords);
                                    }, () => { alert("Could not get location."); }, { enableHighAccuracy: true, timeout: 10000 });
                                }}
                                className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all text-neutral-800 border border-neutral-100"
                            >
                                <MapPin className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

            </div >
        </PageShell >
    );
};

export default HighwayRadarPage;
