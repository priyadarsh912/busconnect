import { useState, useEffect } from 'react';
import { busService, BusRoute } from '../services/busService';

export const useOutstationRoutes = (stateName: string = "Chandigarh") => {
    const [routes, setRoutes] = useState<BusRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                // Outstation routes are generally longer distance (>50km).
                // Fetching from Supabase via busService is the new single source of truth.
                const data = await busService.getAllRoutes();
                
                // Outstation filtering (distance > 50km or explicit flag if we had one)
                const outstation = data.filter(r => r.distance_km > 50);
                setRoutes(outstation);
            } catch (err: any) {
                setError('Failed to load outstation routes from Supabase');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [stateName]);

    return { routes, isLoading, error };
};
