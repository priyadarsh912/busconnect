import { useState, useEffect } from 'react';
import { busService, BusRoute } from '../services/busService';

export const useIntercityRoutes = (stateName: string = "Chandigarh") => {
    const [routes, setRoutes] = useState<BusRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                // In a production app, we would filter by state in the query.
                // For now, we fetch all and can filter client-side if needed, 
                // but busService.getAllRoutes() is the new source of truth.
                const data = await busService.getAllRoutes();
                
                // Assuming intercity routes are those with distance <= 50km or marked as such
                const intercity = data.filter(r => r.distance_km <= 50);
                setRoutes(intercity);
            } catch (err: any) {
                setError('Failed to load intercity routes from Supabase');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [stateName]);

    return { routes, isLoading, error };
};
