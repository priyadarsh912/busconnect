import { useState, useEffect } from 'react';
import { loadOutstationRoutes, OutstationRouteEntry } from '../utils/OutstationLoader';

export const useOutstationRoutes = () => {
    const [routes, setRoutes] = useState<OutstationRouteEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await loadOutstationRoutes();
                setRoutes(data);
            } catch (err) {
                setError('Failed to load outstation routes');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    return { routes, isLoading, error };
};
