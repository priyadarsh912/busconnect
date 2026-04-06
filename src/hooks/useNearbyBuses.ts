// ============================================================
// useNearbyBuses — Production-ready React Hook
// ============================================================
// Manages: GPS location, debounced updates, Firestore real-time
// geo-queries, error states, and radius config.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import {
    nearbyBusService,
    type NearbyBus,
    type GeoQueryConfig,
} from "../services/nearbyBusService";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export type LocationStatus =
    | "idle"
    | "requesting"
    | "granted"
    | "denied"
    | "unavailable"
    | "error";

export interface UseNearbyBusesOptions {
    /** Dynamic search radius (clamped 3–15 km) */
    radiusKm?: number;
    /** Max staleness for bus data in seconds */
    maxAgeSec?: number;
    /** Minimum milliseconds between location updates (debounce) */
    locationDebounceMs?: number;
    /** Disable auto-start (manual trigger only) */
    disabled?: boolean;
}

export interface UseNearbyBusesReturn {
    /** Nearby buses, sorted by distance */
    buses: NearbyBus[];
    /** Whether the initial load is still in progress */
    isLoading: boolean;
    /** User's current location (null until acquired) */
    userLocation: [number, number] | null;
    /** Location permission/availability status */
    locationStatus: LocationStatus;
    /** Error message (location or Firestore) */
    error: string | null;
    /** Current radius being used (clamped) */
    radiusKm: number;
    /** Timestamp of the last successful update */
    lastUpdated: Date | null;
    /** Manually retry location + query */
    retry: () => void;
}

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_MAX_AGE_SEC = 60;
const DEFAULT_LOCATION_DEBOUNCE_MS = 3000;
const LOCATION_HIGH_ACCURACY_TIMEOUT = 10000;
const LOCATION_WATCH_MAX_AGE = 5000;

// ─────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────

export const useNearbyBuses = (
    options: UseNearbyBusesOptions = {}
): UseNearbyBusesReturn => {
    const {
        radiusKm = DEFAULT_RADIUS_KM,
        maxAgeSec = DEFAULT_MAX_AGE_SEC,
        locationDebounceMs = DEFAULT_LOCATION_DEBOUNCE_MS,
        disabled = false,
    } = options;

    // ── State ──────────────────────────────────────
    const [buses, setBuses] = useState<NearbyBus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(
        null
    );
    const [locationStatus, setLocationStatus] =
        useState<LocationStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // ── Refs (stable across renders) ───────────────
    const unsubRef = useRef<(() => void) | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const lastEmitRef = useRef<number>(0);
    const retryCountRef = useRef(0);

    // Clamped radius
    const effectiveRadius = Math.max(3, Math.min(15, radiusKm));

    // ── Teardown helper ────────────────────────────
    const teardown = useCallback(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // ── Start real-time listener at a given center ─
    const startListener = useCallback(
        (lat: number, lng: number) => {
            // Kill any existing listener first
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }

            const config: GeoQueryConfig = {
                lat,
                lng,
                radiusKm: effectiveRadius,
                maxAgeSec,
            };

            setIsLoading(true);

            const unsub = nearbyBusService.onNearbyBusesChange(
                config,
                (nearbyBuses) => {
                    setBuses(nearbyBuses);
                    setIsLoading(false);
                    setLastUpdated(new Date());
                    setError(null);
                },
                (err) => {
                    console.error("[useNearbyBuses] Firestore error:", err);
                    setError(
                        err.message.includes("permission")
                            ? "Firestore permission denied. Check security rules."
                            : `Database error: ${err.message}`
                    );
                    setIsLoading(false);
                }
            );

            unsubRef.current = unsub;
        },
        [effectiveRadius, maxAgeSec]
    );

    // ── Handle location update (debounced) ─────────
    const handleLocationUpdate = useCallback(
        (position: GeolocationPosition) => {
            const now = Date.now();

            // Debounce: skip if too recent
            if (now - lastEmitRef.current < locationDebounceMs) return;
            lastEmitRef.current = now;

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const newLoc: [number, number] = [lat, lng];

            setUserLocation(newLoc);
            setLocationStatus("granted");
            setError(null);
            retryCountRef.current = 0;

            // Re-start listener at new center
            startListener(lat, lng);
        },
        [locationDebounceMs, startListener]
    );

    // ── Handle location error ──────────────────────
    const handleLocationError = useCallback(
        (err: GeolocationPositionError) => {
            console.warn("[useNearbyBuses] Geolocation error:", err);

            switch (err.code) {
                case err.PERMISSION_DENIED:
                    setLocationStatus("denied");
                    setError(
                        "Location permission denied. Please enable location access in your browser settings."
                    );
                    break;
                case err.POSITION_UNAVAILABLE:
                    setLocationStatus("unavailable");
                    setError(
                        "Location unavailable. Please check your GPS or network connection."
                    );
                    break;
                case err.TIMEOUT:
                    setLocationStatus("error");
                    setError(
                        "Location request timed out. Please try again."
                    );
                    break;
                default:
                    setLocationStatus("error");
                    setError("An unknown location error occurred.");
            }

            setIsLoading(false);
        },
        []
    );

    // ── Request location ───────────────────────────
    const requestLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            setLocationStatus("unavailable");
            setError("Geolocation is not supported by this browser.");
            setIsLoading(false);
            return;
        }

        setLocationStatus("requesting");
        setError(null);

        // First: get an immediate position
        navigator.geolocation.getCurrentPosition(
            handleLocationUpdate,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: LOCATION_HIGH_ACCURACY_TIMEOUT,
                maximumAge: LOCATION_WATCH_MAX_AGE,
            }
        );

        // Then: watch for movement
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            handleLocationUpdate,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: LOCATION_HIGH_ACCURACY_TIMEOUT,
                maximumAge: LOCATION_WATCH_MAX_AGE,
            }
        );
    }, [handleLocationUpdate, handleLocationError]);

    // ── Retry handler ──────────────────────────────
    const retry = useCallback(() => {
        retryCountRef.current += 1;
        teardown();
        setBuses([]);
        setIsLoading(true);
        setError(null);
        requestLocation();
    }, [teardown, requestLocation]);

    // ── Effect: bootstrap on mount ─────────────────
    useEffect(() => {
        if (disabled) {
            setIsLoading(false);
            return;
        }

        requestLocation();

        return () => {
            teardown();
        };
    }, [disabled, requestLocation, teardown]);

    // ── Effect: re-subscribe when radius changes ───
    useEffect(() => {
        if (userLocation && !disabled) {
            startListener(userLocation[0], userLocation[1]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveRadius, maxAgeSec]);

    return {
        buses,
        isLoading,
        userLocation,
        locationStatus,
        error,
        radiusKm: effectiveRadius,
        lastUpdated,
        retry,
    };
};
