import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Search, MapPin, AlertCircle, Bus, Clock, Route, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import CrowdBadge from "@/components/CrowdBadge";
import { useCrowdPrediction } from "@/hooks/useCrowdPrediction";
import { RouteHistoryManager } from "../utils/RouteHistoryManager";
import { getRoutesForState } from "../data/stateDatasets";
import { authService } from "../services/authService";
import { busService } from "../services/busService";
import { analyticsService } from "../services/AnalyticsService";

/* ───────────────────── Types ───────────────────── */
interface OutstationRoute {
    route_id: string;
    origin: string;
    destination: string;
    stop_1: string;
    stop_2: string;
    distance_km: number;
    eta_min: number;
    price_inr: number;
    crowd: string;
    operator: string;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;
}

/* ───────────────────── City Aliases ───────────────────── */
const CITY_ALIASES: Record<string, string[]> = {
    chandigarh: ["chandigarh", "chandigarh sector 17", "chandigarh sector 43 bus stand", "chandigarh it park"],
    mohali: ["mohali", "mohali phase 3", "mohali phase 7", "mohali phase 8", "sas nagar"],
    panchkula: ["panchkula", "panchkula sector 5", "panchkula sector 7", "panchkula sector 10"],
    ropar: ["ropar", "rupnagar", "ropar bus stand", "rupnagar bus stand"],
    shimla: ["shimla"],
    delhi_airport: ["delhi airport t3 bus stop", "delhi airport", "igi airport", "t3 terminal", "t1 terminal", "t2 terminal"],
    delhi: ["delhi", "new delhi", "sarai kale khan", "anand vihar", "kashmere gate"],
    amritsar: ["amritsar"],
    ludhiana: ["ludhiana"],
    ambala: ["ambala", "ambala cantt", "ambala city"],
    pathankot: ["pathankot"],
    kharar: ["kharar", "kharar bus stand"],
    landran: ["landran"],
    sunny_enclave: ["sunny enclave"],
};

const resolveCity = (input: string): string[] => {
    const lower = input.trim().toLowerCase();
    if (!lower) return [];

    const sortedGroups = Object.entries(CITY_ALIASES).sort((a, b) => {
        const maxA = Math.max(...a[1].map(s => s.length));
        const maxB = Math.max(...b[1].map(s => s.length));
        return maxB - maxA;
    });

    for (const [, aliases] of sortedGroups) {
        if (aliases.some((a) => lower.includes(a) || a.includes(lower))) {
            return aliases;
        }
    }
    return [lower];
};

const cityMatches = (routeField: string, resolvedAliases: string[]): boolean => {
    const field = routeField.toLowerCase();
    return resolvedAliases.some(
        (alias) => field.includes(alias) || alias.includes(field)
    );
};

const fadeUp: any = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const OutstationSearchPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [routes, setRoutes] = useState<OutstationRoute[]>([]);
    const [filteredRoutes, setFilteredRoutes] = useState<OutstationRoute[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [allCities, setAllCities] = useState<string[]>([]);
    const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
    const [toSuggestions, setToSuggestions] = useState<string[]>([]);
    const { predict: predictCrowd } = useCrowdPrediction();
    const toRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const selectedState = (location.state as any)?.state || localStorage.getItem("selectedState") || "Chandigarh";
        loadData(selectedState);
    }, []);

    const loadData = async (stateName: string) => {
        try {
            setIsLoading(true);
            const data = await getRoutesForState(stateName);

            const outstationRoutes: OutstationRoute[] = data
                .filter(
                    (r) =>
                        String(r.route_type).toLowerCase() === "outstation" &&
                        Number(r.distance_km) >= 40
                )
                .map((r) => ({
                    route_id: r.route_id,
                    origin: r.start_stop,
                    destination: r.end_stop,
                    stop_1: r.stop_1,
                    stop_2: r.stop_2,
                    distance_km: r.distance_km,
                    eta_min: r.eta_min,
                    price_inr: r.price_inr,
                    crowd: r.crowd,
                    operator: r.operator,
                    start_lat: r.start_lat,
                    start_lon: r.start_lon,
                    end_lat: r.end_lat,
                    end_lon: r.end_lon,
                }));

            setRoutes(outstationRoutes);

            const cities = new Set<string>();
            outstationRoutes.forEach((r) => {
                if (r.origin) cities.add(r.origin);
                if (r.destination) cities.add(r.destination);
            });
            setAllCities(Array.from(cities).sort());
        } catch (error) {
            console.error("Error loading outstation data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getSuggestions = (input: string): string[] => {
        if (!input.trim()) return [];
        const lower = input.trim().toLowerCase();
        const resolved = resolveCity(input);
        return allCities
            .filter(
                (c) =>
                    c.toLowerCase().includes(lower) ||
                    resolved.some((alias) => c.toLowerCase().includes(alias))
            )
            .slice(0, 8);
    };

    const handleSearch = () => {
        if (!from.trim() || !to.trim()) return;

        setHasSearched(true);

        const fromAliases = resolveCity(from);
        const toAliases = resolveCity(to);

        const matches = routes.filter((r) => {
            const forwardMatch =
                cityMatches(r.origin, fromAliases) && cityMatches(r.destination, toAliases);
            const reverseMatch =
                cityMatches(r.origin, toAliases) && cityMatches(r.destination, fromAliases);
            return forwardMatch || reverseMatch;
        });

        setFilteredRoutes(matches);

        // Track search interaction
        analyticsService.logEvent('search_bus', { 
            from: from.trim(), 
            to: to.trim(), 
            results_count: matches.length,
            trip_type: 'outstation'
        });

        // Track search interaction to Supabase (Legacy compatibility)
        const user = authService.getCurrentUser();
        if (user && (matches.length > 0 || (from && to))) {
            busService.saveSearchHistory(user.id, from, to, 'outstation').catch(() => {});
        }
    };

    const canSearch = from.trim().length > 0 && to.trim().length > 0 && !isLoading;

    return (
        <PageShell>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => navigate("/trip-type")}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 text-foreground" />
                </motion.button>
                <div>
                    <h1 className="text-xl font-extrabold leading-tight">Outstation Search</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        Find long-distance buses (≥ 40 km)
                    </p>
                </div>
            </motion.div>

            {/* Search Card */}
            <motion.div
                variants={fadeUp}
                className="rounded-2xl border-2 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 overflow-visible relative"
            >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />

                <div className="p-5 space-y-4">
                    {/* FROM */}
                    <div className="relative">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">FROM</span>
                        <div className="relative mt-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            <input
                                type="text"
                                value={from}
                                onChange={(e) => {
                                    setFrom(e.target.value);
                                    setFromSuggestions(getSuggestions(e.target.value));
                                }}
                                onFocus={() => setFromSuggestions(getSuggestions(from))}
                                onBlur={() => setTimeout(() => setFromSuggestions([]), 200)}
                                placeholder="Enter origin city..."
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-3 bg-background/80 rounded-xl border border-border outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold text-sm"
                            />
                            <AnimatePresence>
                                {fromSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="absolute left-0 right-0 top-full z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden mt-1"
                                    >
                                        {fromSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onPointerDown={(e) => {
                                                    e.preventDefault();
                                                    setFrom(s);
                                                    setFromSuggestions([]);
                                                    toRef.current?.focus();
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2 text-foreground"
                                            >
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                {s}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* TO */}
                    <div className="relative">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">TO</span>
                        <div className="relative mt-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
                            <input
                                ref={toRef}
                                type="text"
                                value={to}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setToSuggestions(getSuggestions(e.target.value));
                                }}
                                onFocus={() => setToSuggestions(getSuggestions(to))}
                                onBlur={() => setTimeout(() => setToSuggestions([]), 200)}
                                placeholder="Enter destination city..."
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-3 bg-background/80 rounded-xl border border-border outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold text-sm"
                            />
                            <AnimatePresence>
                                {toSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="absolute left-0 right-0 top-full z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden mt-1"
                                    >
                                        {toSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onPointerDown={(e) => {
                                                    e.preventDefault();
                                                    setTo(s);
                                                    setToSuggestions([]);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center gap-2 text-foreground"
                                            >
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                {s}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Search Button */}
                    <motion.div
                        whileTap={canSearch ? { scale: 0.97 } : {}}
                        whileHover={canSearch ? { scale: 1.01 } : {}}
                    >
                        <Button
                            onClick={handleSearch}
                            disabled={!canSearch}
                            className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 transition-opacity text-white"
                        >
                            {isLoading ? (
                                "Loading Data..."
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" /> Search Outstation Buses
                                </>
                            )}
                        </Button>
                    </motion.div>
                </div>
            </motion.div>

            {/* Results */}
            <div className="mt-8 pb-24">
                <AnimatePresence mode="wait">
                    {hasSearched ? (
                        filteredRoutes.length > 0 ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                    {filteredRoutes.length} Bus{filteredRoutes.length !== 1 ? "es" : ""} Found
                                </p>
                                {filteredRoutes.map((route, idx) => (
                                    <motion.div
                                        key={route.route_id + idx}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className="p-4 rounded-2xl border border-border bg-card hover:border-emerald-400/40 transition-colors shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase border border-emerald-200 dark:border-emerald-800">
                                                    {route.operator}
                                                </span>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                                                    {route.route_id}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-black text-foreground">₹{route.price_inr}</span>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Fare</p>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-base mb-3">
                                            {route.origin}{" "}
                                            <span className="text-muted-foreground font-normal">→</span>{" "}
                                            {route.destination}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium mb-3">
                                            <div className="flex items-center gap-1">
                                                <Route className="w-3 h-3 text-emerald-500" />
                                                {route.distance_km} km
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-blue-500" />
                                                {route.eta_min} min
                                            </div>
                                            {(() => {
                                                const prediction = predictCrowd(route.origin, route.destination, { distanceKm: route.distance_km });
                                                return <CrowdBadge level={prediction.level} score={prediction.percentage} />;
                                            })()}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 rounded-xl text-xs font-bold"
                                                onClick={() => {
                                                    RouteHistoryManager.trackRoute(route, 'outstation');
                                                    analyticsService.logEvent('track_bus_clicked', { 
                                                        bus_id: route.route_id, 
                                                        route: `${route.origin} → ${route.destination}` 
                                                    });
                                                    navigate("/tracking", {
                                                        state: {
                                                            tripType: "outstation",
                                                            route: {
                                                                route_id: route.route_id,
                                                                start_stop: route.origin,
                                                                end_stop: route.destination,
                                                                stop_1: route.stop_1,
                                                                stop_2: route.stop_2,
                                                                distance_km: route.distance_km,
                                                                eta_min: route.eta_min,
                                                                price_inr: route.price_inr,
                                                                crowd: route.crowd,
                                                                operator: route.operator,
                                                                start_lat: route.start_lat,
                                                                start_lon: route.start_lon,
                                                                end_lat: route.end_lat,
                                                                end_lon: route.end_lon,
                                                                route_type: "outstation",
                                                            },
                                                        },
                                                    });
                                                }}
                                            >
                                                <Bus className="w-3 h-3 mr-1" /> Track Bus
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                                                onClick={() => {
                                                    const user = authService.getCurrentUser();
                                                    analyticsService.logEvent('route_selected', { 
                                                        bus_id: route.route_id, 
                                                        route: `${route.origin} → ${route.destination}` 
                                                    });
                                                    if (user) {
                                                        busService.saveSearchHistory(user.id, route.origin, route.destination, 'outstation').catch(() => {});
                                                    }
                                                    navigate("/seat-selection", {
                                                        state: {
                                                            route_id: route.route_id,
                                                            origin: route.origin,
                                                            destination: route.destination,
                                                            distance_km: route.distance_km,
                                                            eta: route.eta_min,
                                                            price: route.price_inr,
                                                            operator: route.operator,
                                                        },
                                                    });
                                                }}
                                            >
                                                <Ticket className="w-3 h-3 mr-1" /> Book Ticket
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                                    <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <h3 className="font-bold text-lg">No Buses Found</h3>
                                <p className="text-sm text-muted-foreground max-w-[260px] mt-1">
                                    No outstation buses available for this route.
                                </p>
                            </motion.div>
                        )
                    ) : (
                        !isLoading && (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center opacity-40"
                            >
                                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    Enter origin and destination to search
                                </p>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </PageShell>
    );
};

export default OutstationSearchPage;
