// ============================================================
// NearbyBusesPage — Full-Screen Live Nearby Buses View
// ============================================================
// Combines useNearbyBuses hook with the NearbyBusesMap component.
// Handles all edge cases: loading, empty results, permission
// denial, network failure. Includes radius slider control.
// ============================================================

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    MapPin,
    Bus,
    Wifi,
    WifiOff,
    RefreshCw,
    Minus,
    Plus,
    Radar,
    AlertTriangle,
    Navigation,
    Clock,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import NearbyBusesMap from "@/components/NearbyBusesMap";
import {
    useNearbyBuses,
    type LocationStatus,
} from "@/hooks/useNearbyBuses";
import type { NearbyBus } from "@/services/nearbyBusService";

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

const formatTimeAgo = (date: Date | null): string => {
    if (!date) return "—";
    const secs = Math.round((Date.now() - date.getTime()) / 1000);
    if (secs < 5) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
};

const distanceBadgeColor = (km: number): string => {
    if (km <= 3) return "bg-green-100 text-green-700 border-green-200";
    if (km <= 7) return "bg-amber-50 text-amber-700 border-amber-200";
    if (km <= 12) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-700 border-red-200";
};

const statusMessages: Record<LocationStatus, { icon: React.ReactNode; text: string; color: string }> = {
    idle: { icon: <MapPin className="w-5 h-5" />, text: "Initializing...", color: "text-slate-500" },
    requesting: { icon: <Navigation className="w-5 h-5 animate-pulse" />, text: "Acquiring location...", color: "text-blue-600" },
    granted: { icon: <Navigation className="w-5 h-5" />, text: "Location active", color: "text-green-600" },
    denied: { icon: <AlertTriangle className="w-5 h-5" />, text: "Location denied", color: "text-red-600" },
    unavailable: { icon: <WifiOff className="w-5 h-5" />, text: "Location unavailable", color: "text-orange-600" },
    error: { icon: <AlertTriangle className="w-5 h-5" />, text: "Location error", color: "text-red-600" },
};

// ─────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────

const NearbyBusesPage = () => {
    const navigate = useNavigate();
    const [radiusKm, setRadiusKm] = useState(10);
    const [showBusList, setShowBusList] = useState(false);

    const {
        buses,
        isLoading,
        userLocation,
        locationStatus,
        error,
        radiusKm: effectiveRadius,
        lastUpdated,
        retry,
    } = useNearbyBuses({ radiusKm });

    const handleRadiusChange = useCallback((delta: number) => {
        setRadiusKm((prev) => Math.max(3, Math.min(15, prev + delta)));
    }, []);

    const handleBusClick = useCallback(
        (bus: NearbyBus) => {
            // Could navigate to tracking or show detail
            console.log("Bus clicked:", bus);
        },
        []
    );

    const isError = locationStatus === "denied" || locationStatus === "unavailable" || locationStatus === "error";

    return (
        <PageShell noPadding>
            <div className="relative w-full h-full min-h-screen bg-background overflow-hidden">
                {/* ── Map Layer ──────────────────────────── */}
                <NearbyBusesMap
                    userLocation={userLocation}
                    buses={buses}
                    radiusKm={effectiveRadius}
                    onBusClick={handleBusClick}
                />

                {/* ── Top Header ─────────────────────────── */}
                <div
                    className="absolute left-0 right-0 z-[1000] pointer-events-none"
                    style={{ top: "12px" }}
                >
                    <div className="max-w-md mx-auto px-4">
                        {/* Nav Row */}
                        <div className="flex items-center justify-between mb-3 pointer-events-auto">
                            <Link
                                to="/"
                                className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all text-neutral-800 border border-neutral-100"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>

                            <div className="flex-1 text-center px-4">
                                <h1 className="text-lg font-black text-neutral-900 tracking-tight leading-none">
                                    Nearby Buses
                                </h1>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                                    Live · Geo-Queried · Real-Time
                                </p>
                            </div>

                            <button
                                onClick={retry}
                                className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all text-neutral-800 border border-neutral-100"
                                title="Refresh location"
                            >
                                <RefreshCw
                                    id="refresh-location-btn"
                                    className={`w-5 h-5 ${
                                        isLoading ? "animate-spin" : ""
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Radius Control */}
                        <div className="bg-white/92 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/50 pointer-events-auto">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Radar className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-neutral-700">
                                        Search Radius
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        id="radius-decrease-btn"
                                        onClick={() =>
                                            handleRadiusChange(-1)
                                        }
                                        disabled={radiusKm <= 3}
                                        className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 disabled:opacity-30 active:scale-90 transition-all"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-extrabold text-blue-600 w-12 text-center tabular-nums">
                                        {effectiveRadius} km
                                    </span>
                                    <button
                                        id="radius-increase-btn"
                                        onClick={() =>
                                            handleRadiusChange(1)
                                        }
                                        disabled={radiusKm >= 15}
                                        className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 disabled:opacity-30 active:scale-90 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Radius Slider */}
                            <div className="mt-2.5">
                                <input
                                    type="range"
                                    min={3}
                                    max={15}
                                    step={1}
                                    value={radiusKm}
                                    onChange={(e) =>
                                        setRadiusKm(
                                            parseInt(e.target.value, 10)
                                        )
                                    }
                                    id="radius-slider-input"
                                    className="w-full h-1.5 bg-gradient-to-r from-green-400 via-amber-400 to-red-400 rounded-full appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2
                                        [&::-webkit-slider-thumb]:border-blue-500
                                        [&::-webkit-slider-thumb]:cursor-pointer
                                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                                        [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full
                                        [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2
                                        [&::-moz-range-thumb]:border-blue-500
                                        [&::-moz-range-thumb]:cursor-pointer"
                                />
                                <div className="flex justify-between mt-1">
                                    <span className="text-[9px] font-semibold text-green-600">
                                        3 km
                                    </span>
                                    <span className="text-[9px] font-semibold text-neutral-400">
                                        Min radius
                                    </span>
                                    <span className="text-[9px] font-semibold text-red-500">
                                        15 km
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Bottom Panel ───────────────────────── */}
                <div className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-auto">
                    <div className="max-w-md mx-auto">
                        {/* Status Bar */}
                        <div className="mx-4 mb-2">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-neutral-100 overflow-hidden">
                                {/* Status + Count Row */}
                                <div className="px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`${statusMessages[locationStatus].color}`}
                                        >
                                            {statusMessages[locationStatus].icon}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-neutral-800">
                                                {isLoading
                                                    ? "Scanning..."
                                                    : buses.length > 0
                                                    ? `${buses.length} bus${
                                                          buses.length !== 1
                                                              ? "es"
                                                              : ""
                                                      } found`
                                                    : "No buses nearby"}
                                            </div>
                                            <div className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(lastUpdated)}
                                            </div>
                                        </div>
                                    </div>

                                    {buses.length > 0 && (
                                        <button
                                            onClick={() =>
                                                setShowBusList(!showBusList)
                                            }
                                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                        >
                                            {showBusList
                                                ? "Hide List"
                                                : "View List"}
                                        </button>
                                    )}
                                </div>

                                {/* ── Error State ───────────────── */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-3">
                                                <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2.5">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-semibold text-red-700">
                                                            {error}
                                                        </p>
                                                        <button
                                                            onClick={retry}
                                                            className="mt-2 text-[10px] font-bold text-red-600 bg-red-100 px-3 py-1 rounded-md active:scale-95 transition-all"
                                                        >
                                                            Try Again
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* ── Bus List ──────────────────── */}
                                <AnimatePresence>
                                    {showBusList && buses.length > 0 && (
                                        <motion.div
                                            initial={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                                                <div className="space-y-2">
                                                    {buses.map((bus) => (
                                                        <div
                                                            key={bus.busId}
                                                            className="flex items-center justify-between bg-neutral-50 rounded-xl p-3 border border-neutral-100"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <Bus className="w-4.5 h-4.5 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-neutral-800">
                                                                        Bus{" "}
                                                                        {
                                                                            bus.busId
                                                                        }
                                                                    </div>
                                                                    <div className="text-[10px] text-neutral-400 font-medium">
                                                                        Driver:{" "}
                                                                        {bus.driverId ||
                                                                            "N/A"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${distanceBadgeColor(
                                                                    bus.distanceKm
                                                                )}`}
                                                            >
                                                                {bus.distanceKm.toFixed(
                                                                    1
                                                                )}{" "}
                                                                km
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* ── Empty State ───────────────── */}
                                <AnimatePresence>
                                    {!isLoading &&
                                        !error &&
                                        buses.length === 0 &&
                                        locationStatus === "granted" && (
                                            <motion.div
                                                initial={{
                                                    height: 0,
                                                    opacity: 0,
                                                }}
                                                animate={{
                                                    height: "auto",
                                                    opacity: 1,
                                                }}
                                                exit={{
                                                    height: 0,
                                                    opacity: 0,
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-3">
                                                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                            <Bus className="w-6 h-6 text-slate-300" />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-600">
                                                            No buses within{" "}
                                                            {effectiveRadius}{" "}
                                                            km
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            Try increasing the
                                                            search radius or
                                                            check back shortly.
                                                        </p>
                                                        <button
                                                            onClick={() =>
                                                                setRadiusKm(15)
                                                            }
                                                            className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                                        >
                                                            Expand to 15 km
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                </AnimatePresence>

                                {/* ── Loading Skeleton ──────────── */}
                                <AnimatePresence>
                                    {isLoading && (
                                        <motion.div
                                            initial={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-3">
                                                <div className="space-y-2">
                                                    {[1, 2, 3].map((i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-3 bg-neutral-50 rounded-xl p-3 animate-pulse"
                                                        >
                                                            <div className="w-9 h-9 bg-neutral-200 rounded-lg" />
                                                            <div className="flex-1">
                                                                <div className="h-3 w-20 bg-neutral-200 rounded-md mb-1.5" />
                                                                <div className="h-2.5 w-14 bg-neutral-100 rounded-md" />
                                                            </div>
                                                            <div className="h-5 w-12 bg-neutral-200 rounded-full" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Safe area spacer for mobile */}
                        <div className="h-2" />
                    </div>
                </div>
            </div>
        </PageShell>
    );
};

export default NearbyBusesPage;
