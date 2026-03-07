/**
 * CrowdPredictionEngine — Standalone module for predicting bus crowd levels.
 *
 * Uses historical route data, time-of-day, day-of-week, booking ratios,
 * route popularity, and weather to calculate a weighted crowd score.
 *
 * This module has ZERO dependencies on any existing application logic.
 */

/* ─── Types ─── */

export interface CrowdHistoryRecord {
    route_id: string;
    origin: string;
    destination: string;
    avg_load: number;
    popularity: "high" | "medium" | "low";
}

export interface CrowdPredictionInput {
    origin: string;
    destination: string;
    /** Current hour (0-23). Defaults to Date.now() */
    hour?: number;
    /** Day of week (0=Sun, 6=Sat). Defaults to Date.now() */
    dayOfWeek?: number;
    /** Number of tickets already booked for this trip */
    ticketBookings?: number;
    /** Total bus capacity (seats) */
    busCapacity?: number;
    /** Distance in km — used only for fallback display */
    distanceKm?: number;
    /** Weather: clear | rain | storm */
    weather?: "clear" | "rain" | "storm";
}

export interface CrowdPredictionResult {
    /** 0-1 weighted score */
    score: number;
    /** low | medium | high */
    level: "low" | "medium" | "high";
    /** Human-readable label */
    label: string;
    /** Percentage (0-100) for display */
    percentage: number;
}

/* ─── Normalisation helpers ─── */

/**
 * Normalise a city name to its base form for matching.
 * e.g. "Chandigarh Sector 17" → "chandigarh", "Mohali Phase 8" → "mohali"
 */
const normaliseCity = (raw: string): string => {
    const lower = raw.trim().toLowerCase();

    // Map known compound names to base city
    const aliases: Record<string, string> = {
        "chandigarh sector 17": "chandigarh",
        "chandigarh sector 43 bus stand": "chandigarh",
        "chandigarh it park": "chandigarh",
        "mohali phase 3": "mohali",
        "mohali phase 7": "mohali",
        "mohali phase 8": "mohali",
        "sas nagar": "mohali",
        "rupnagar": "ropar",
        "rupnagar bus stand": "ropar",
        "ropar bus stand": "ropar",
        "panchkula sector 5": "panchkula",
        "panchkula sector 7": "panchkula",
        "panchkula sector 10": "panchkula",
        "ambala cantt": "ambala",
        "ambala city": "ambala",
        "new delhi": "delhi",
        "kharar bus stand": "kharar",
    };

    if (aliases[lower]) return aliases[lower];

    // Fallback: strip sector / phase suffixes
    const base = lower
        .replace(/\s+sector\s+\d+.*$/i, "")
        .replace(/\s+phase\s+\d+.*$/i, "")
        .replace(/\s+bus\s+stand$/i, "")
        .replace(/\s+it\s+park$/i, "")
        .trim();

    return base;
};

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

export const getBookingFactor = (
    bookings: number,
    capacity: number
): number => {
    if (capacity <= 0) return 0.4; // failsafe
    const ratio = bookings / capacity;
    if (ratio <= 0.3) return 0.3;
    if (ratio <= 0.7) return 0.6;
    return 0.9;
};

export const getPopularityFactor = (
    popularity: string
): number => {
    const p = popularity?.toLowerCase() || "medium";
    if (p === "high") return 0.8;
    if (p === "low") return 0.3;
    return 0.5; // medium or unknown
};

export const getWeatherFactor = (
    weather: string
): number => {
    const w = weather?.toLowerCase() || "clear";
    if (w === "storm") return 0.8;
    if (w === "rain") return 0.7;
    return 0.5; // clear
};

/* ─── Crowd classification ─── */

export const classifyCrowd = (
    score: number
): { level: "low" | "medium" | "high"; label: string } => {
    if (score <= 0.4) return { level: "low", label: "Low Crowd" };
    if (score <= 0.7) return { level: "medium", label: "Medium Crowd" };
    return { level: "high", label: "High Crowd" };
};

/* ─── Historical data loader ─── */

let historyCache: Map<string, CrowdHistoryRecord> | null = null;
let loadingPromise: Promise<Map<string, CrowdHistoryRecord>> | null = null;

/** Build a lookup key from origin + destination */
const makeKey = (origin: string, destination: string): string =>
    `${normaliseCity(origin)}→${normaliseCity(destination)}`;

export const loadCrowdHistory = async (): Promise<
    Map<string, CrowdHistoryRecord>
> => {
    // Return cached data
    if (historyCache) return historyCache;

    // Avoid duplicate fetches
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const map = new Map<string, CrowdHistoryRecord>();

        try {
            const response = await fetch("/datasets/crowd_history_dataset.csv");
            const text = await response.text();
            const lines = text.trim().split("\n");

            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(",").map((c) => c.trim());
                if (cols.length < 5) continue;

                const record: CrowdHistoryRecord = {
                    route_id: cols[0],
                    origin: cols[1],
                    destination: cols[2],
                    avg_load: parseFloat(cols[3]) || 0.5,
                    popularity: (cols[4] as "high" | "medium" | "low") || "medium",
                };

                const key = makeKey(record.origin, record.destination);
                // If duplicate key, keep the one with higher avg_load (worst case)
                const existing = map.get(key);
                if (!existing || record.avg_load > existing.avg_load) {
                    map.set(key, record);
                }
            }
        } catch (err) {
            console.warn("[CrowdPredictionEngine] Failed to load historical data:", err);
        }

        historyCache = map;
        loadingPromise = null;
        return map;
    })();

    return loadingPromise;
};

/* ─── Main prediction function ─── */

export const predictCrowd = async (
    input: CrowdPredictionInput
): Promise<CrowdPredictionResult> => {
    const now = new Date();
    const hour = input.hour ?? now.getHours();
    const dayOfWeek = input.dayOfWeek ?? now.getDay();
    const weather = input.weather ?? "clear";

    // Load historical data
    const history = await loadCrowdHistory();
    const key = makeKey(input.origin, input.destination);
    const reverseKey = makeKey(input.destination, input.origin);
    const record = history.get(key) || history.get(reverseKey);

    // Historical or fallback defaults
    const historicalAvgLoad = record?.avg_load ?? 0.5;
    const routePopularity = record?.popularity ?? "medium";

    // Factor calculations
    const timeFactor = getTimeFactor(hour);
    const dayFactor = getDayFactor(dayOfWeek);
    const routeFactor = getPopularityFactor(routePopularity);
    const bookingFactor = getBookingFactor(
        input.ticketBookings ?? 0,
        input.busCapacity ?? 50
    );
    const weatherFactor = getWeatherFactor(weather);

    // Weighted score
    const score =
        timeFactor * 0.25 +
        dayFactor * 0.10 +
        routeFactor * 0.20 +
        bookingFactor * 0.25 +
        historicalAvgLoad * 0.15 +
        weatherFactor * 0.05;

    // Clamp to [0, 1]
    const clampedScore = Math.max(0, Math.min(1, score));

    const { level, label } = classifyCrowd(clampedScore);

    return {
        score: clampedScore,
        level,
        label,
        percentage: Math.round(clampedScore * 100),
    };
};

/**
 * Synchronous prediction using already-loaded history.
 * Returns null if history isn't loaded yet.
 */
export const predictCrowdSync = (
    input: CrowdPredictionInput
): CrowdPredictionResult | null => {
    if (!historyCache) return null;

    const now = new Date();
    const hour = input.hour ?? now.getHours();
    const dayOfWeek = input.dayOfWeek ?? now.getDay();
    const weather = input.weather ?? "clear";

    const key = makeKey(input.origin, input.destination);
    const reverseKey = makeKey(input.destination, input.origin);
    const record = historyCache.get(key) || historyCache.get(reverseKey);

    const historicalAvgLoad = record?.avg_load ?? 0.5;
    const routePopularity = record?.popularity ?? "medium";

    const timeFactor = getTimeFactor(hour);
    const dayFactor = getDayFactor(dayOfWeek);
    const routeFactor = getPopularityFactor(routePopularity);
    const bookingFactor = getBookingFactor(
        input.ticketBookings ?? 0,
        input.busCapacity ?? 50
    );
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
