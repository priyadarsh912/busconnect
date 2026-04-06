import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, MapPin, Bus, ChevronDown, ChevronUp, ArrowDownUp, Users, X } from "lucide-react";
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from "framer-motion";
import { format, addMinutes } from "date-fns";
import PageShell from "@/components/PageShell";

// --- Types ---
type BusRoute = {
    routeNo: string;
    busNo: string;
    from: string;
    to: string;
    distance: number;
};

type CrowdLevel = "Low" | "Moderate" | "High";

type EnrichedRoute = BusRoute & {
    crowdLevel: CrowdLevel;
    seatProbability: number;
    etaMinutes: number;
    departureTime: Date;
    arrivalTime: Date;
};

// --- City Coordinates ---
const CITY_COORDS: Record<string, [number, number]> = {
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
};

const CITY_NAMES = Object.keys(CITY_COORDS);

// --- Helpers ---
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

const getSeatProbability = (busNo: string, crowd: CrowdLevel): number => {
    const base = crowd === "Low" ? 75 : crowd === "Moderate" ? 45 : 15;
    return Math.min(99, base + (hashStr(busNo) % 20));
};

const crowdColor = (c: CrowdLevel) =>
    c === "Low" ? "#22c55e" : c === "Moderate" ? "#eab308" : "#ef4444";

const crowdBg = (c: CrowdLevel) =>
    c === "Low" ? "bg-green-100 text-green-700" : c === "Moderate" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

const crowdTextColor = (c: CrowdLevel) =>
    c === "Low" ? "#16a34a" : c === "Moderate" ? "#ca8a04" : "#dc2626";

const parseCSV = (text: string): BusRoute[] => {
    const lines = text.trim().split('\n');
    const routes: BusRoute[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 5) continue;
        routes.push({
            routeNo: cols[0].trim(),
            busNo: cols[1].trim(),
            from: cols[2].trim(),
            to: cols[3].trim(),
            distance: parseFloat(cols[4].trim()) || 0,
        });
    }
    return routes;
};

const renderBusMarkerHtml = (routeNo: string, to: string, etaMinutes: number, crowdLevel: CrowdLevel, color: string, textCol: string) => `
<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto">
  <div style="background:rgba(15,23,42,0.9);backdrop-filter:blur(4px);color:white;padding:6px 10px;border-radius:10px;font-size:10px;box-shadow:0 4px 12px rgba(0,0,0,0.5);min-width:90px;border:1px solid rgba(255,255,255,0.1)">
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
      <div style="background:${color};color:white;font-weight:800;font-size:9px;padding:2px 6px;border-radius:4px">${routeNo}</div>
      <span style="font-weight:600;font-size:10px">${to}</span>
    </div>
    <div style="color:${textCol};font-weight:700;font-size:11px">${etaMinutes} mins away</div>
    <div style="color:#94a3b8;font-size:9px;margin-top:1px">≡ƒæÑ ${crowdLevel} Crowd</div>
  </div>
  <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid rgba(15,23,42,0.9)"></div>
  <div style="width:28px;height:28px;border-radius:6px;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);margin-top:2px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="4" y="2" width="16" height="20" rx="3"/><rect x="6" y="4" width="12" height="4" rx="1" fill="${color}" opacity="0.6"/></svg>
  </div>
</div>`;

// --- Component ---
const HighwayRadarPage = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markerLayerGroup = useRef<L.LayerGroup | null>(null);
    const routeLineGroup = useRef<L.LayerGroup | null>(null);
    const radarLayerGroup = useRef<L.LayerGroup | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const allRoutesRef = useRef<BusRoute[]>([]);
    const userCoordsRef = useRef<[number, number]>([30.7333, 76.7794]);

    const [isLoading, setIsLoading] = useState(true);
    const [fromCity, setFromCity] = useState("");
    const [toCity, setToCity] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [results, setResults] = useState<EnrichedRoute[]>([]);
    const [expandedBus, setExpandedBus] = useState<string | null>(null);
    const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
    const [toSuggestions, setToSuggestions] = useState<string[]>([]);

    // Mostly used route pairs (fallback when not searched)
    const [popularRoutes, setPopularRoutes] = useState<EnrichedRoute[]>([]);

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
                        startRadarPulse(coords);
                        drawNearbyBuses(coords);
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

    // Load CSV
    useEffect(() => {
        fetch('/busRoutes.csv')
            .then(r => r.text())
            .then(text => {
                const routes = parseCSV(text);
                allRoutesRef.current = routes;
                setIsLoading(false);

                // Generate 5 Popular Routes
                const popularPairs = [
                    { f: "Chandigarh", t: "Ludhiana" },
                    { f: "Amritsar", t: "Jalandhar" },
                    { f: "Patiala", t: "Chandigarh" },
                    { f: "Bathinda", t: "Patiala" },
                    { f: "Ropar", t: "Chandigarh" }
                ];

                const popular: EnrichedRoute[] = popularPairs.map(pair => {
                    const match = routes.find(r => r.from.toLowerCase() === pair.f.toLowerCase() && r.to.toLowerCase() === pair.t.toLowerCase());
                    if (match) {
                        const crowd = getCrowdLevel(match.distance);
                        // Realistic bus speed ~50km/h -> 1.2 mins per km
                        const etaMins = Math.round(match.distance * 1.2);
                        // Stagger departures based on hash so not all say "now"
                        const offsetMins = (hashStr(match.busNo) % 90) - 15; // -15 to +75 mins from now
                        const depTime = addMinutes(new Date(), offsetMins);

                        return {
                            ...match,
                            crowdLevel: crowd,
                            seatProbability: getSeatProbability(match.busNo, crowd),
                            etaMinutes: etaMins,
                            departureTime: depTime,
                            arrivalTime: addMinutes(depTime, etaMins),
                        };
                    }
                    return null;
                }).filter(Boolean) as EnrichedRoute[];

                setPopularRoutes(popular);
            })
            .catch(() => setIsLoading(false));
    }, []);

    // Dropdown UI logic (must appear before map drawing so it can be referenced)
    type SheetSnap = 'peek' | 'full' | 'minimized';
    const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');

    const handleBusClick = useCallback((route: EnrichedRoute) => {
        // Expand this bus card using a compound key
        setExpandedBus(`${route.busNo}-${route.routeNo}-${route.from}`);

        // If it's not in the currently visible list, ensure we add it or handle it gracefully
        // For nearby buses (not in results), we actually need to inject it into popularRoutes so it shows up
        if (!hasSearched) {
            setPopularRoutes(prev => {
                const exists = prev.find(r => r.busNo === route.busNo && r.routeNo === route.routeNo);
                if (!exists) {
                    return [route, ...prev]; // Put it at the top
                }
                return prev;
            });
        }

        // Slide the bottom sheet up so the user can read it
        setSheetSnap('peek');
    }, [hasSearched]);

    // Draw nearby buses on map (called after CSV loads or when search is cleared)
    const drawNearbyBuses = useCallback((coords: [number, number]) => {
        if (!markerLayerGroup.current || allRoutesRef.current.length === 0) return;

        markerLayerGroup.current.clearLayers();
        routeLineGroup.current?.clearLayers();

        // Pick 6-10 random buses to simulate "nearby"
        const numNearby = 6 + Math.floor(Math.random() * 5);
        const shuffled = [...allRoutesRef.current].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, numNearby);

        selected.forEach(route => {
            // Generate random coordinate within ~15km radius
            const latOffset = (Math.random() - 0.5) * 0.25;
            const lngOffset = (Math.random() - 0.5) * 0.25;

            const lat = coords[0] + latOffset;
            const lng = coords[1] + lngOffset;

            const crowd = getCrowdLevel(route.distance);
            const color = crowdColor(crowd);
            const textCol = crowdTextColor(crowd);
            const etaMins = Math.max(2, Math.round(Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 600));

            const busIcon = L.divIcon({
                className: '',
                html: renderBusMarkerHtml(route.routeNo, route.to, etaMins, crowd, color, textCol),
                iconSize: [0, 0],
                iconAnchor: [50, 80],
            });
            const marker = L.marker([lat, lng], { icon: busIcon }).addTo(markerLayerGroup.current!);

            // Make the leaf marker clickable
            marker.on('click', () => {
                // The drawn bus doesn't have an exact matching etaMinutes in the payload unless we stored it.
                // Reconstruct the enriched route with the displayed etaMinutes for consistency.
                const clickedRoute: EnrichedRoute = {
                    ...route,
                    crowdLevel: crowd,
                    etaMinutes: etaMins,
                    seatProbability: getSeatProbability(route.busNo, crowd),
                    departureTime: addMinutes(new Date(), -10),
                    arrivalTime: addMinutes(new Date(), etaMins),
                };
                handleBusClick(clickedRoute);
            });
        });
    }, []);

    // Effect: Draw nearby buses once CSV is loaded and no search is active
    useEffect(() => {
        if (!isLoading && !hasSearched) {
            drawNearbyBuses(userCoordsRef.current);
        }
    }, [isLoading, hasSearched, drawNearbyBuses]);

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

    // Autocomplete
    const getSuggestions = (input: string): string[] => {
        if (!input.trim()) return [];
        return CITY_NAMES.filter(c => c.toLowerCase().startsWith(input.toLowerCase())).slice(0, 5);
    };

    const handleFromChange = (val: string) => {
        setFromCity(val);
        setFromSuggestions(getSuggestions(val));
    };

    const handleToChange = (val: string) => {
        setToCity(val);
        setToSuggestions(getSuggestions(val));
    };

    const swapCities = () => {
        setFromCity(toCity);
        setToCity(fromCity);
        setFromSuggestions([]);
        setToSuggestions([]);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromCity.trim() || !toCity.trim() || isLoading) return;

        setIsSearching(true);
        setExpandedBus(null);
        setFromSuggestions([]);
        setToSuggestions([]);

        const fromKey = CITY_NAMES.find(c => c.toLowerCase() === fromCity.trim().toLowerCase()) || fromCity.trim();
        const toKey = CITY_NAMES.find(c => c.toLowerCase() === toCity.trim().toLowerCase()) || toCity.trim();

        // Filter: exact FromΓåÆTo match
        const matched = allRoutesRef.current.filter(
            r => r.from.toLowerCase() === fromKey.toLowerCase() &&
                r.to.toLowerCase() === toKey.toLowerCase()
        );

        const enriched: EnrichedRoute[] = matched.map(r => {
            const crowd = getCrowdLevel(r.distance);
            // Realistic bus speed ~50km/h -> 1.2 mins per km
            const etaMins = Math.round(r.distance * 1.2);
            // Stagger departures
            const offsetMins = (hashStr(r.busNo) % 90) - 15;
            const depTime = addMinutes(new Date(), offsetMins);

            return {
                ...r,
                crowdLevel: crowd,
                seatProbability: getSeatProbability(r.busNo, crowd),
                etaMinutes: etaMins,
                departureTime: depTime,
                arrivalTime: addMinutes(depTime, etaMins),
            };
        });

        enriched.sort((a, b) => a.distance - b.distance);
        setResults(enriched);
        setHasSearched(true);

        // Draw on map
        const fromCoords = CITY_COORDS[fromKey];
        const toCoords = CITY_COORDS[toKey];

        if (markerLayerGroup.current) markerLayerGroup.current.clearLayers();
        if (routeLineGroup.current) routeLineGroup.current.clearLayers();

        if (fromCoords && toCoords && map.current) {
            // Fit bounds
            const bounds = L.latLngBounds([fromCoords, toCoords]);
            map.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });

            // Draw dotted route line
            L.polyline([fromCoords, toCoords], {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.6,
                dashArray: '8 8',
            }).addTo(routeLineGroup.current!);

            // From marker
            const fromIcon = L.divIcon({
                className: '',
                html: `<div style="background:#2563eb;color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;gap:4px">
                 <div style="width:8px;height:8px;border-radius:50%;background:#60a5fa;border:2px solid white"></div>
                 ${fromKey}
               </div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
            });
            L.marker(fromCoords, { icon: fromIcon }).addTo(markerLayerGroup.current!);

            // To marker
            const toIcon = L.divIcon({
                className: '',
                html: `<div style="background:#dc2626;color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;gap:4px">
                 <div style="width:8px;height:8px;border-radius:50%;background:#fca5a5;border:2px solid white"></div>
                 ${toKey}
               </div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
            });
            L.marker(toCoords, { icon: toIcon }).addTo(markerLayerGroup.current!);

            // Bus markers scattered along route
            const maxMarkers = Math.min(enriched.length, 8);
            for (let i = 0; i < maxMarkers; i++) {
                const route = enriched[i];
                const t = (i + 1) / (maxMarkers + 1);
                // Jitter so they don't overlap
                const jLat = (hashStr(route.busNo + 'lat') % 40 - 20) * 0.002;
                const jLng = (hashStr(route.busNo + 'lng') % 40 - 20) * 0.002;
                const lat = fromCoords[0] + (toCoords[0] - fromCoords[0]) * t + jLat;
                const lng = fromCoords[1] + (toCoords[1] - fromCoords[1]) * t + jLng;
                const color = crowdColor(route.crowdLevel);
                const textCol = crowdTextColor(route.crowdLevel);

                const busIcon = L.divIcon({
                    className: '',
                    html: renderBusMarkerHtml(route.routeNo, route.to, route.etaMinutes, route.crowdLevel, color, textCol),
                    iconSize: [0, 0],
                    iconAnchor: [50, 80],
                });
                const marker = L.marker([lat, lng], { icon: busIcon }).addTo(markerLayerGroup.current!);
                marker.on('click', () => handleBusClick(route));
            }
        }

        setIsSearching(false);
    };

    // Convert snap state to a top offset in vh
    // The sheet is positioned with top style, so:
    // 'full' = top at 15vh (shows 85vh of content)
    // 'peek' = top at 60vh (shows 40vh of content)
    // 'minimized' = top at 88vh (shows only handle + part of header)
    const getSheetTop = (snap: SheetSnap): string => {
        switch (snap) {
            case 'full': return '15vh';
            case 'peek': return '55vh';
            case 'minimized': return '88vh';
        }
    };

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
          }
        `}</style>

                {/* Top: Navigation + From-To Card */}
                <div className="absolute left-0 right-0 z-[1000] pointer-events-none" style={{ top: '10px' }}>
                    <div className="max-w-md mx-auto px-3">
                        {/* Back & Location buttons */}
                        <div className="flex items-center justify-between mb-2 pointer-events-auto">
                            <Link to="/" className="w-9 h-9 bg-white/90 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform text-neutral-800">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => {
                                    if (!navigator.geolocation) { alert("Location not supported."); return; }
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                                        userCoordsRef.current = coords;
                                        map.current?.flyTo(coords, 13);
                                        userMarkerRef.current?.setLatLng(coords);
                                        startRadarPulse(coords);
                                        drawNearbyBuses(coords);
                                    }, () => { alert("Could not get location."); }, { enableHighAccuracy: true, timeout: 10000 });
                                }}
                                className="w-9 h-9 bg-white/90 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform text-neutral-800"
                            >
                                <MapPin className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Dark From-To Card */}
                        <AnimatePresence mode="wait">
                            {hasSearched ? (
                                /* Minimized dark pill after search */
                                <motion.div
                                    key="minimized-pill"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                                    onClick={() => { setHasSearched(false); setSheetSnap('peek'); }}
                                    className="rounded-full shadow-lg px-4 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all pointer-events-auto"
                                    style={{ background: '#1a1d2e' }}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 shrink-0" style={{ borderColor: '#6366f1' }} />
                                        <span className="font-semibold text-[14px] truncate" style={{ color: '#ffffff' }}>{fromCity}</span>
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                                        <span className="font-semibold text-[14px] truncate" style={{ color: '#ffffff' }}>{toCity}</span>
                                    </div>
                                    <Search className="w-4 h-4 shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                                </motion.div>
                            ) : (
                                /* Full expanded dark card */
                                <motion.div
                                    key="expanded-card"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                                >
                                    <form onSubmit={handleSearch} className="pointer-events-auto">
                                        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: '#1a1d2e' }}>
                                            <div className="flex items-stretch">
                                                {/* Left: Dots + Connecting Line */}
                                                <div className="flex flex-col items-center py-4 pl-4 pr-1" style={{ width: '28px', minWidth: '28px' }}>
                                                    <div className="w-3 h-3 rounded-full border-[2.5px] shrink-0" style={{ borderColor: '#6366f1' }} />
                                                    <div className="flex-1 w-[2px] my-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                                                </div>

                                                {/* Center: Inputs */}
                                                <div className="flex-1 flex flex-col min-w-0">
                                                    {/* FROM */}
                                                    <div className="relative px-2 pt-3 pb-2">
                                                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>FROM</span>
                                                        <input
                                                            type="text"
                                                            value={fromCity}
                                                            onChange={e => handleFromChange(e.target.value)}
                                                            onFocus={() => setFromSuggestions(getSuggestions(fromCity))}
                                                            onBlur={() => setTimeout(() => setFromSuggestions([]), 300)}
                                                            placeholder="Enter origin"
                                                            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                                                            style={{ fontSize: '15px', color: '#ffffff', background: 'transparent', WebkitAppearance: 'none' }}
                                                            className="w-full font-semibold outline-none placeholder:text-white/30 border-none bg-transparent mt-0.5"
                                                        />
                                                        {fromSuggestions.length > 0 && (
                                                            <div className="absolute left-0 right-0 top-full bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden" style={{ zIndex: 9999 }}>
                                                                {fromSuggestions.map(s => (
                                                                    <button key={s} type="button" onPointerDown={(e) => { e.preventDefault(); setFromCity(s); setFromSuggestions([]); }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2" style={{ color: '#1a1a1a', fontSize: '14px' }}>
                                                                        <MapPin className="w-3.5 h-3.5" style={{ color: '#6b7280' }} /> {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Divider */}
                                                    <div className="mx-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                                                    {/* TO */}
                                                    <div className="relative px-2 pt-2 pb-3">
                                                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>TO</span>
                                                        <input
                                                            type="text"
                                                            value={toCity}
                                                            onChange={e => handleToChange(e.target.value)}
                                                            onFocus={() => setToSuggestions(getSuggestions(toCity))}
                                                            onBlur={() => setTimeout(() => setToSuggestions([]), 300)}
                                                            placeholder="Enter destination"
                                                            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                                                            style={{ fontSize: '15px', color: '#ffffff', background: 'transparent', WebkitAppearance: 'none' }}
                                                            className="w-full font-semibold outline-none placeholder:text-white/30 border-none bg-transparent mt-0.5"
                                                        />
                                                        {toSuggestions.length > 0 && (
                                                            <div className="absolute left-0 right-0 top-full bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden" style={{ zIndex: 9999 }}>
                                                                {toSuggestions.map(s => (
                                                                    <button key={s} type="button" onPointerDown={(e) => { e.preventDefault(); setToCity(s); setToSuggestions([]); }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2" style={{ color: '#1a1a1a', fontSize: '14px' }}>
                                                                        <MapPin className="w-3.5 h-3.5" style={{ color: '#6b7280' }} /> {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Swap Button */}
                                                <div className="flex items-center pr-3 pl-1">
                                                    <button type="button" onClick={swapCities}
                                                        className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                                                        <ArrowDownUp className="w-4 h-4" style={{ color: '#818cf8' }} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Search Buses Button */}
                                            <div className="px-4 pb-4 pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={isSearching || isLoading || !fromCity.trim() || !toCity.trim()}
                                                    className="w-full font-bold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                                                    style={{ background: '#4f46e5', color: '#ffffff' }}
                                                >
                                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                                    {isSearching ? "Searching..." : "Search Buses"}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Draggable Bottom Sheet Results */}
                {(hasSearched || popularRoutes.length > 0) && (
                    <motion.div
                        key="bottom-sheet"
                        initial={{ top: '100vh' }}
                        animate={{ top: getSheetTop(sheetSnap) }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.3}
                        onDragEnd={(_, info) => {
                            const velocityThreshold = 300;
                            const offsetThreshold = 80;

                            if (info.velocity.y < -velocityThreshold || info.offset.y < -offsetThreshold) {
                                // Swiped up
                                if (sheetSnap === 'minimized') {
                                    setSheetSnap('peek');
                                } else {
                                    setSheetSnap('full');
                                }
                            } else if (info.velocity.y > velocityThreshold || info.offset.y > offsetThreshold) {
                                // Swiped down
                                if (sheetSnap === 'full') {
                                    setSheetSnap('peek');
                                } else {
                                    setSheetSnap('minimized');
                                }
                            }
                            // If neither threshold is met, stay at current snap (spring back)
                        }}
                        className="fixed left-0 right-0 max-w-md mx-auto z-[2000] flex flex-col bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] touch-none"
                        style={{ height: '90vh' }}
                    >
                        {/* Drag Handle */}
                        <div className="w-full h-8 flex justify-center items-center cursor-grab active:cursor-grabbing shrink-0">
                            <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 py-3 flex items-center justify-between shrink-0 border-b border-border/30">
                            {hasSearched ? (
                                <>
                                    <div>
                                        <h2 className="font-bold text-lg flex items-center gap-2 text-neutral-800">
                                            <Bus className="w-5 h-5 text-primary" />
                                            {fromCity} <span className="text-muted-foreground mx-0.5">ΓåÆ</span> {toCity}
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                            {results.length} buses found
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setHasSearched(false); setResults([]); markerLayerGroup.current?.clearLayers(); routeLineGroup.current?.clearLayers(); setSheetSnap('peek'); }}
                                            className="text-sm font-bold px-4 py-2 rounded-full bg-neutral-100 text-neutral-600 active:scale-95 transition-transform"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => setSheetSnap('minimized')}
                                            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center active:scale-90 transition-transform"
                                        >
                                            <X className="w-4 h-4 text-neutral-500" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h2 className="font-bold text-lg flex items-center gap-2 text-neutral-800">
                                            Mostly Used Routes
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                            Popular connections in Punjab
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSheetSnap('minimized')}
                                        className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center active:scale-90 transition-transform"
                                    >
                                        <X className="w-4 h-4 text-neutral-500" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1 px-4 pb-32 space-y-4 pt-2">
                            {hasSearched && results.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                                    No direct buses on this route.
                                </div>
                            ) : (
                                (hasSearched ? results : popularRoutes).map((route) => {
                                    const uniqueKey = `${route.busNo}-${route.routeNo}-${route.from}`;
                                    const isExpanded = expandedBus === uniqueKey;
                                    return (
                                        <motion.div
                                            key={uniqueKey}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-white border border-neutral-100/80 rounded-[20px] shadow-sm overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setExpandedBus(isExpanded ? null : uniqueKey)}
                                                className="w-full p-4 flex items-center gap-4 text-left active:bg-neutral-50 transition-colors"
                                            >
                                                {/* Bus icon matching Figma (colored rounded square) */}
                                                <div
                                                    className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                                                    style={{ background: crowdColor(route.crowdLevel) + '20' }}
                                                >
                                                    <Bus className="w-6 h-6" style={{ color: crowdColor(route.crowdLevel) }} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="font-bold text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                                                            {route.routeNo}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{route.busNo}</span>
                                                    </div>
                                                    <p className="text-[15px] font-bold text-neutral-800 truncate leading-tight">
                                                        {route.from} <span className="text-muted-foreground text-sm">ΓåÆ</span> {route.to}
                                                    </p>

                                                    {/* Real-time Schedule */}
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-neutral-600">
                                                        <span>{format(route.departureTime, 'h:mm a')}</span>
                                                        <span className="text-muted-foreground/60 w-3 h-[1px] bg-neutral-300"></span>
                                                        <span>{format(route.arrivalTime, 'h:mm a')}</span>
                                                        {route.departureTime < new Date() ? (
                                                            <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">On Route</span>
                                                        ) : (
                                                            <span className="ml-1.5 text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-bold">Scheduled</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                    <p className="text-[15px] font-extrabold text-neutral-900">{route.distance.toFixed(1)} km</p>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="px-4 pb-4 border-t border-neutral-100 bg-neutral-50/50"
                                                    >
                                                        <div className="grid grid-cols-3 gap-3 pt-4">
                                                            <div className="bg-white rounded-[14px] p-3 text-center shadow-sm border border-neutral-100">
                                                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center justify-center gap-1">Crowd</p>
                                                                <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${crowdBg(route.crowdLevel)}`}>{route.crowdLevel}</span>
                                                            </div>
                                                            <div className="bg-white rounded-[14px] p-3 text-center shadow-sm border border-neutral-100">
                                                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center justify-center gap-1">Seat Prob.</p>
                                                                <p className="text-lg font-black text-neutral-800 leading-none">{route.seatProbability}%</p>
                                                            </div>
                                                            <div className="bg-white rounded-[14px] p-3 text-center shadow-sm border border-neutral-100">
                                                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center justify-center gap-1">Duration</p>
                                                                <p className="text-lg font-black text-neutral-800 leading-none">
                                                                    {Math.floor(route.etaMinutes / 60) > 0 ? `${Math.floor(route.etaMinutes / 60)}h ` : ''}
                                                                    {route.etaMinutes % 60}m
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 px-1 pb-1">
                                                            <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                                                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Seat Availability</span>
                                                                <span className="text-neutral-800">{route.seatProbability}%</span>
                                                            </div>
                                                            <div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden shadow-inner flex">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${route.seatProbability}%` }}
                                                                    transition={{ duration: 0.5, delay: 0.1 }}
                                                                    className="h-full rounded-r-full"
                                                                    style={{ background: crowdColor(route.crowdLevel) }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )
                }
            </div >
        </PageShell >
    );
};

export default HighwayRadarPage;
