import { useState, useEffect, useCallback, useRef } from "react";
import {
    loadCrowdHistory,
    predictCrowdSync,
    type CrowdPredictionInput,
    type CrowdPredictionResult,
} from "@/utils/CrowdPredictionEngine";

/**
 * React hook that provides crowd prediction for bus routes.
 *
 * - Auto-loads historical data on mount (singleton — only fetches once).
 * - `predict()` returns a synchronous result once data is loaded.
 * - Auto-refreshes when the hour changes to reflect time-based demand.
 */
export const useCrowdPrediction = () => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load historical data on mount
    useEffect(() => {
        loadCrowdHistory().then(() => setIsLoaded(true));
    }, []);

    // Re-check hour every 60 seconds so predictions stay current
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const newHour = new Date().getHours();
            if (newHour !== currentHour) {
                setCurrentHour(newHour);
            }
        }, 60_000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [currentHour]);

    /**
     * Predict crowd for a given origin-destination pair.
     * Returns a safe default if historical data isn't loaded yet.
     */
    const predict = useCallback(
        (
            origin: string,
            destination: string,
            options?: Partial<Omit<CrowdPredictionInput, "origin" | "destination">>
        ): CrowdPredictionResult => {
            if (!isLoaded) {
                // Safe default while loading
                return { score: 0.5, level: "medium", label: "Medium Crowd", percentage: 50 };
            }

            const result = predictCrowdSync({
                origin,
                destination,
                hour: currentHour,
                dayOfWeek: new Date().getDay(),
                ...options,
            });

            // Failsafe: should never be null when isLoaded is true, but just in case
            return result ?? { score: 0.5, level: "medium", label: "Medium Crowd", percentage: 50 };
        },
        [isLoaded, currentHour]
    );

    return { predict, isLoaded };
};
