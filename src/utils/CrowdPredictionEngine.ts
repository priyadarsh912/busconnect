import { supabase } from '../lib/supabase';

/**
 * CrowdPredictionEngine — Standalone module for predicting bus crowd levels.
 *
 * Uses historical route data, time-of-day, day-of-week, booking ratios,
 * route popularity, and weather to calculate a weighted crowd score.
 */

/* ─── Types ─── */

export interface CrowdHistoryRecord {
    id: string;
    route_id: string;
    avg_load: number;
    popularity: "high" | "medium" | "low";
}

export interface CrowdPredictionInput {
    origin: string;
    destination: string;
    /** Current hour (0-23) */
    hour?: number;
    /** Day of week (0=Sun, 6=Sat) */
    dayOfWeek?: number;
    /** Number of tickets already booked for this trip */
    ticketBookings?: number;
    /** Total bus capacity (seats) */
    busCapacity?: number;
    /** Weather: clear | rain | storm */
    weather?: "clear" | "rain" | "storm";
}

export interface CrowdPredictionResult {
    score: number;
    level: "low" | "medium" | "high";
    label: string;
    percentage: number;
}

/* ─── Factor functions ─── */

export const getTimeFactor = (hour: number): number => {
    if (hour >= 6 && hour < 10) return 0.9;
    if (hour >= 10 && hour < 16) return 0.5;
    if (hour >= 16 && hour < 20) return 0.9;
    return 0.2; // 8 PM – 6 AM
};

export const getDayFactor = (dayOfWeek: number): number => {
    if (dayOfWeek === 0) return 0.4; // Sunday
    if (dayOfWeek === 6) return 0.6; // Saturday
    return 0.8; // Mon-Fri
};

export const getBookingFactor = (bookings: number, capacity: number): number => {
    if (capacity <= 0) return 0.4;
    const ratio = bookings / capacity;
    if (ratio <= 0.3) return 0.3;
    if (ratio <= 0.7) return 0.6;
    return 0.9;
};

export const getPopularityFactor = (popularity: string): number => {
    const p = popularity?.toLowerCase() || "medium";
    if (p === "high") return 0.8;
    if (p === "low") return 0.3;
    return 0.5;
};

export const getWeatherFactor = (weather: string): number => {
    const w = weather?.toLowerCase() || "clear";
    if (w === "storm") return 0.8;
    if (w === "rain") return 0.7;
    return 0.5;
};

export const classifyCrowd = (score: number): { level: "low" | "medium" | "high"; label: string } => {
    if (score <= 0.4) return { level: "low", label: "Low Crowd" };
    if (score <= 0.7) return { level: "medium", label: "Medium Crowd" };
    return { level: "high", label: "High Crowd" };
};

/* ─── State Management ─── */

let historyCache: Map<string, CrowdHistoryRecord> | null = null;
let loadingPromise: Promise<Map<string, CrowdHistoryRecord>> | null = null;

export const loadCrowdHistory = async (): Promise<Map<string, CrowdHistoryRecord>> => {
    if (historyCache) return historyCache;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const map = new Map<string, CrowdHistoryRecord>();
        try {
            const { data, error } = await supabase
                .from('crowd_history')
                .select('*');

            if (error) throw error;

            (data || []).forEach((record: any) => {
                map.set(record.route_id, record);
            });
        } catch (err) {
            console.warn("[CrowdPredictionEngine] Failed to load Supabase crowd data:", err);
            // Fallback: Populate with empty map to avoid repeated attempts
        }
        historyCache = map;
        loadingPromise = null;
        return map;
    })();

    return loadingPromise;
};

/* ─── Prediction logic ─── */

export const predictCrowd = async (input: CrowdPredictionInput): Promise<CrowdPredictionResult> => {
    const now = new Date();
    const hour = input.hour ?? now.getHours();
    const dayOfWeek = input.dayOfWeek ?? now.getDay();
    const weather = input.weather ?? "clear";

    const history = await loadCrowdHistory();
    // In a real app, we would use a proper route ID. 
    // Fallback logic for demo matching:
    const record = history.get(`${input.origin}-${input.destination}`) || 
                   history.get(`${input.destination}-${input.origin}`);

    const historicalAvgLoad = record?.avg_load ?? 0.5;
    const routePopularity = record?.popularity ?? "medium";

    const timeFactor = getTimeFactor(hour);
    const dayFactor = getDayFactor(dayOfWeek);
    const routeFactor = getPopularityFactor(routePopularity);
    const bookingFactor = getBookingFactor(input.ticketBookings ?? 0, input.busCapacity ?? 50);
    const weatherFactor = getWeatherFactor(weather);

    const score =
        timeFactor * 0.25 +
        dayFactor * 0.10 +
        routeFactor * 0.20 +
        bookingFactor * 0.25 +
        historicalAvgLoad * 0.15 +
        weatherFactor * 0.05;

    const clampedScore = Math.max(0, Math.min(1, score));
    const { level, label } = classifyCrowd(clampedScore);

    return {
        score: clampedScore,
        level,
        label,
        percentage: Math.round(clampedScore * 100),
    };
};

export const predictCrowdSync = (input: CrowdPredictionInput): CrowdPredictionResult | null => {
    if (!historyCache) return null;

    const now = new Date();
    const hour = input.hour ?? now.getHours();
    const dayOfWeek = input.dayOfWeek ?? now.getDay();
    const weather = input.weather ?? "clear";

    const record = historyCache.get(`${input.origin}-${input.destination}`) || 
                   historyCache.get(`${input.destination}-${input.origin}`);

    const historicalAvgLoad = record?.avg_load ?? 0.5;
    const routePopularity = record?.popularity ?? "medium";

    const timeFactor = getTimeFactor(hour);
    const dayFactor = getDayFactor(dayOfWeek);
    const routeFactor = getPopularityFactor(routePopularity);
    const bookingFactor = getBookingFactor(input.ticketBookings ?? 0, input.busCapacity ?? 50);
    const weatherFactor = getWeatherFactor(weather);

    const score =
        timeFactor * 0.25 +
        dayFactor * 0.10 +
        routeFactor * 0.20 +
        bookingFactor * 0.25 +
        historicalAvgLoad * 0.15 +
        weatherFactor * 0.05;

    const clampedScore = Math.max(0, Math.min(1, score));
    const { level, label } = classifyCrowd(clampedScore);

    return {
        score: clampedScore,
        level,
        label,
        percentage: Math.round(clampedScore * 100),
    };
};
