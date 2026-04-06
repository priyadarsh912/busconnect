import { useState, useEffect } from 'react';
import { OutstationRouteEntry } from '../utils/OutstationLoader';
import { getRoutesForState } from '../data/stateDatasets';

export const useOutstationRoutes = (stateName: string = "Chandigarh") => {
    const [routes, setRoutes] = useState<OutstationRouteEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await getRoutesForState(stateName, "outstation");
                setRoutes(data);
            } catch (err) {
                setError('Failed to load outstation routes');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [stateName]);

    return { routes, isLoading, error };
};
