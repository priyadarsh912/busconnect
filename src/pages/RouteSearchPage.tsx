import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useIntercityRoutes } from "@/hooks/useIntercityRoutes";
import { useOutstationRoutes } from "@/hooks/useOutstationRoutes";
import { RouteEntry } from "@/utils/ExcelLoader";
import { OutstationRouteEntry } from "@/utils/OutstationLoader";
import { RouteHistoryManager } from "../utils/RouteHistoryManager";

const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const RouteSearchPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedState: string = location.state?.state || localStorage.getItem("selectedState") || "Chandigarh";
    const tripType: "intercity" | "outstation" = location.state?.tripType ?? "intercity";

    // Hooks - separate engines
    const intercity = useIntercityRoutes(selectedState);
    const outstation = useOutstationRoutes(selectedState);

    const [allCities, setAllCities] = useState<string[]>([]);
    const [popularRoutes, setPopularRoutes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
    const [toSuggestions, setToSuggestions] = useState<string[]>([]);
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);

    // Unified data management
    useEffect(() => {
        const loading = tripType === "intercity" ? intercity.isLoading : outstation.isLoading;
        setIsLoading(loading);

        if (!loading) {
            if (tripType === "intercity") {
                const routes = intercity.routes.filter(r => r.distance_km <= 35);
                const stops = new Set<string>();
                routes.forEach(r => {
                    if (r.from_stop) stops.add(r.from_stop);
                    if (r.to_stop) stops.add(r.to_stop);
                });
                setAllCities(Array.from(stops).sort());

                const seen = new Set<string>();
                const popular: RouteEntry[] = [];
                for (const r of routes) {
                    const key = `${r.from_stop}|${r.stop}|${r.to_stop}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    popular.push(r);
                    if (popular.length >= 5) break;
                }
                setPopularRoutes(popular);
            } else {
                const routes = outstation.routes;
                const cities = new Set<string>();
                routes.forEach(r => {
                    if (r.start_city) cities.add(r.start_city);
                    if (r.end_city) cities.add(r.end_city);
                });
                setAllCities(Array.from(cities).sort());

                const seen = new Set<string>();
                const popular: OutstationRouteEntry[] = [];
                for (const r of routes) {
                    const key = `${r.start_city}|${r.stop_city}|${r.end_city}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    popular.push(r);
                    if (popular.length >= 5) break;
                }
                setPopularRoutes(popular);
            }
        }
    }, [tripType, intercity.isLoading, outstation.isLoading, intercity.routes, outstation.routes]);

    const getSuggestions = (input: string): string[] => {
        if (!input.trim()) return [];
        return allCities
            .filter((c) => c.toLowerCase().startsWith(input.toLowerCase()))
            .slice(0, 6);
    };

    const handleFromChange = (val: string) => {
        setOrigin(val);
        setFromSuggestions(getSuggestions(val));
    };

    const handleToChange = (val: string) => {
        setDestination(val);
        setToSuggestions(getSuggestions(val));
    };

    const swap = () => {
        setOrigin(destination);
        setDestination(origin);
        setFromSuggestions([]);
        setToSuggestions([]);
    };

    const handleSearch = () => {
        if (!origin.trim() || !destination.trim()) return;

        // Track interaction
        RouteHistoryManager.trackRoute({
            route_id: `${origin.trim()}-${destination.trim()}`,
            from_stop: origin.trim(),
            to_stop: destination.trim()
        }, tripType);

        if (tripType === "intercity" && selectedState === "Chandigarh") {
            navigate("/connecting-routes", {
                state: { origin: origin.trim(), destination: destination.trim() },
            });
        } else {
            navigate("/routes", {
                state: { state: selectedState, tripType, origin: origin.trim(), destination: destination.trim() },
            });
        }
    };

    const accentColor = tripType === "intercity" ? "#4f46e5" : "#ea580c";
    const tripLabel = tripType === "intercity" ? "Intercity" : "Outstation";
    const accentBg = tripType === "intercity"
        ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800"
        : "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800";
    const accentPill = tripType === "intercity"
        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

    const canSearch = origin.trim().length > 0 && destination.trim().length > 0;

    return (
        <PageShell>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 text-foreground" />
                </motion.button>
                <div>
                    <h1 className="text-xl font-extrabold leading-tight">Search Routes</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {selectedState} &bull; {tripLabel}
                    </p>
                </div>
            </motion.div>

            {/* State + trip type pill */}
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                    {selectedState}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${accentPill}`}>
                    {tripLabel}
                </span>
            </motion.div>

            {/* Search card */}
            <motion.div
                variants={fadeUp}
                className={`rounded-2xl border-2 ${accentBg} overflow-visible relative`}
            >
                <div className="flex items-stretch">
                    {/* Left: Dots + Line */}
                    <div className="flex flex-col items-center py-4 pl-4 pr-2 w-8 shrink-0">
                        <div className="w-3 h-3 rounded-full border-[2.5px] shrink-0" style={{ borderColor: accentColor }} />
                        <div className="flex-1 w-[2px] my-1.5" style={{ background: "rgba(0,0,0,0.1)" }} />
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: accentColor }} />
                    </div>

                    {/* CENTER: Inputs */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* FROM */}
                        <div className="relative px-2 pt-3 pb-2">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">FROM</span>
                            <input
                                ref={fromRef}
                                type="text"
                                value={origin}
                                onChange={(e) => handleFromChange(e.target.value)}
                                onFocus={() => setFromSuggestions(getSuggestions(origin))}
                                onBlur={() => setTimeout(() => setFromSuggestions([]), 250)}
                                placeholder={tripType === "outstation" ? "Enter city name..." : "Enter sector or phase"}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="words"
                                spellCheck={false}
                                className="w-full font-semibold text-[15px] outline-none bg-transparent border-none placeholder:text-muted-foreground/50 text-foreground mt-0.5"
                            />
                            {/* FROM dropdown */}
                            <AnimatePresence>
                                {fromSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 right-0 top-full z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden mt-1"
                                    >
                                        {fromSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onPointerDown={(e) => {
                                                    e.preventDefault();
                                                    setOrigin(s);
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

                        <div className="mx-2 border-t border-border/40" />

                        {/* TO */}
                        <div className="relative px-2 pt-2 pb-3">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">TO</span>
                            <input
                                ref={toRef}
                                type="text"
                                value={destination}
                                onChange={(e) => handleToChange(e.target.value)}
                                onFocus={() => setToSuggestions(getSuggestions(destination))}
                                onBlur={() => setTimeout(() => setToSuggestions([]), 250)}
                                placeholder={tripType === "outstation" ? "Enter destination city..." : "Enter sector or phase"}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="words"
                                spellCheck={false}
                                className="w-full font-semibold text-[15px] outline-none bg-transparent border-none placeholder:text-muted-foreground/50 text-foreground mt-0.5"
                            />
                            {/* TO dropdown */}
                            <AnimatePresence>
                                {toSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 right-0 top-full z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden mt-1"
                                    >
                                        {toSuggestions.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onPointerDown={(e) => {
                                                    e.preventDefault();
                                                    setDestination(s);
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

                    {/* Swap button */}
                    <div className="flex items-center pr-4 pl-2 shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.85, rotate: 180 }}
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            onClick={swap}
                            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md border border-border bg-background"
                        >
                            <ArrowLeftRight className="w-4 h-4 text-foreground" />
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Search button */}
            <motion.div variants={fadeUp} className="mt-5">
                <motion.div
                    whileTap={canSearch ? { scale: 0.97 } : {}}
                    whileHover={canSearch ? { scale: 1.01 } : {}}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                >
                    <Button
                        onClick={handleSearch}
                        disabled={!canSearch}
                        className="w-full h-13 rounded-2xl font-bold text-base py-4 flex items-center justify-center gap-2"
                        style={{ background: canSearch ? accentColor : undefined }}
                    >
                        <Search className="w-5 h-5" />
                        Search Buses
                    </Button>
                </motion.div>
            </motion.div>

            {/* Popular routes hint */}
            <motion.div variants={fadeUp} className="mt-8 pb-20">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Popular {tripLabel} Routes
                </p>
                <div className="space-y-2">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading routes…</p>
                    ) : popularRoutes.length === 0 ? (
                        <div className="py-8 text-center bg-secondary/30 rounded-2xl border border-dashed border-border">
                            <p className="text-sm text-muted-foreground">
                                {tripType === "outstation"
                                    ? "No outstation routes available yet."
                                    : "No intercity routes found."}
                            </p>
                        </div>
                    ) : (
                        popularRoutes.map((route, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.06 }}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    const from = tripType === "intercity" ? (route as RouteEntry).from_stop : (route as OutstationRouteEntry).start_city;
                                    const to = tripType === "intercity" ? (route as RouteEntry).to_stop : (route as OutstationRouteEntry).end_city;
                                    setOrigin(from);
                                    setDestination(to);
                                    navigate("/routes", {
                                        state: { state: selectedState, tripType, origin: from, destination: to },
                                    });
                                }}
                                className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                                    <span className="text-sm font-semibold text-foreground truncate block w-full pr-4 leading-relaxed">
                                        {tripType === "intercity" ? (
                                            <>
                                                {(route as RouteEntry).from_stop}{" "}
                                                <span className="text-muted-foreground font-normal">→</span>{" "}
                                                <span className="text-primary">{(route as RouteEntry).stop}</span>{" "}
                                                <span className="text-muted-foreground font-normal">→</span>{" "}
                                                {(route as RouteEntry).to_stop}
                                            </>
                                        ) : (
                                            <>
                                                {(route as OutstationRouteEntry).start_city}{" "}
                                                <span className="text-muted-foreground font-normal">→</span>{" "}
                                                <span className="text-primary">{(route as OutstationRouteEntry).stop_city}</span>{" "}
                                                <span className="text-muted-foreground font-normal">→</span>{" "}
                                                {(route as OutstationRouteEntry).end_city}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180 shrink-0" />
                            </motion.button>
                        ))
                    )}
                </div>
            </motion.div>
        </PageShell>
    );
};

export default RouteSearchPage;
