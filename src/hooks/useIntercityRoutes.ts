import { useState, useEffect } from 'react';
import { RouteEntry } from '../utils/ExcelLoader';
import { getRoutesForState } from '../data/stateDatasets';

export const useIntercityRoutes = (stateName: string = "Chandigarh") => {
    const [routes, setRoutes] = useState<RouteEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await getRoutesForState(stateName, "intercity");
                setRoutes(data);
            } catch (err) {
                setError('Failed to load intercity routes');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [stateName]);

    return { routes, isLoading, error };
};
