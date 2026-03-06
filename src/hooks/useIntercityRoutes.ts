import { useState, useEffect } from 'react';
import { loadBusRoutes, RouteEntry } from '../utils/ExcelLoader';

export const useIntercityRoutes = () => {
    const [routes, setRoutes] = useState<RouteEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await loadBusRoutes();
                setRoutes(data);
            } catch (err) {
                setError('Failed to load intercity routes');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    return { routes, isLoading, error };
};
