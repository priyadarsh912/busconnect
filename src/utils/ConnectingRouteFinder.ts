import { supabase } from '../lib/supabase';

export interface BusRoute {
    start_stop: string;
    bus_no: string;
    end_stop: string;
}

export interface RouteStep {
    from: string;
    to: string;
    busNo: string;
}

export interface RouteResult {
    type: 'direct' | 'connecting' | 'none';
    steps: RouteStep[];
    transferStop?: string;
}

export const loadConnectingRoutes = async (): Promise<BusRoute[]> => {
    try {
        // Query routes with names from Supabase
        const { data, error } = await supabase
            .from('routes')
            .select(`
                id,
                source:source_stop_id (name),
                destination:destination_stop_id (name)
            `);

        if (error) throw error;

        return (data || []).map(r => ({
            start_stop: (r.source as any)?.name || 'Unknown',
            bus_no: r.id.toString(), // Using route ID as bus number for now
            end_stop: (r.destination as any)?.name || 'Unknown'
        }));
    } catch (error) {
        console.error('Error loading connecting routes from Supabase:', error);
        return [];
    }
};

const normalizeStop = (stop: string) => {
    return stop.toLowerCase()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const findConnectingRoute = (from: string, to: string, routes: BusRoute[]): RouteResult => {
    const normalizedFrom = normalizeStop(from);
    const normalizedTo = normalizeStop(to);

    if (!normalizedFrom || !normalizedTo) {
        return { type: 'none', steps: [] };
    }

    // 1. Check for Direct Route
    const directRoute = routes.find(r =>
        normalizeStop(r.start_stop) === normalizedFrom &&
        normalizeStop(r.end_stop) === normalizedTo
    );

    if (directRoute) {
        return {
            type: 'direct',
            steps: [{
                from: directRoute.start_stop,
                to: directRoute.end_stop,
                busNo: directRoute.bus_no
            }]
        };
    }

    // 2. Check for Connecting Route (exactly 2 steps)
    const firstLegs = routes.filter(r => normalizeStop(r.start_stop) === normalizedFrom);
    const secondLegs = routes.filter(r => normalizeStop(r.end_stop) === normalizedTo);

    for (const first of firstLegs) {
        for (const second of secondLegs) {
            if (normalizeStop(first.end_stop) === normalizeStop(second.start_stop)) {
                return {
                    type: 'connecting',
                    transferStop: first.end_stop,
                    steps: [
                        {
                            from: first.start_stop,
                            to: first.end_stop,
                            busNo: first.bus_no
                        },
                        {
                            from: second.start_stop,
                            to: second.end_stop,
                            busNo: second.bus_no
                        }
                    ]
                };
            }
        }
    }

    return { type: 'none', steps: [] };
};
