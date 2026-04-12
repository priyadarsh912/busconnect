import { supabase } from '../lib/supabase';

export interface UnifiedRoute {
  route_id: string;
  start_stop: string;
  stop_1: string;
  stop_2: string;
  end_stop: string;
  distance_km: number;
  eta_min: number;
  price_inr: number;
  crowd: string;
  operator: string;
  route_type: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  highway: string;
}

/**
 * Migration Bridge: Maps Supabase Route data to a unified format
 * to ensure the UI doesn't break during refactoring.
 */
function mapSupabaseToUnifiedRoute(route: any): UnifiedRoute {
  return {
    route_id: route.id?.toString() || 'unknown',
    start_stop: route.source?.name || 'Unknown',
    stop_1: '', // Intermediate stops are handled separately now
    stop_2: '',
    end_stop: route.destination?.name || 'Unknown',
    distance_km: Number(route.distance_km || 0),
    eta_min: Math.round(Number(route.distance_km || 0) * 1.5), // Heuristic estimate
    price_inr: Number(route.pricing?.min_fare || route.base_fare || 0),
    crowd: 'Low', // Placeholder for upcoming AI integration
    operator: 'BusConnect Express',
    route_type: 'outstation',
    start_lat: route.source?.latitude || 0,
    start_lon: route.source?.longitude || 0,
    end_lat: route.destination?.latitude || 0,
    end_lon: route.destination?.longitude || 0,
    highway: route.destination?.name?.includes('Delhi') ? 'NH44' : 'NH7'
  };
}

export const getRoutesForState = async (stateName: string, tripType: "intercity" | "outstation" = "outstation"): Promise<UnifiedRoute[]> => {
    try {
        // Query routes with nested joins for source/destination/state data
        const { data, error } = await supabase
            .from('routes')
            .select(`
                *,
                source:source_stop_id (
                    name, 
                    latitude, 
                    longitude, 
                    district:district_id (
                        state:state_id (name)
                    )
                ),
                destination:destination_stop_id (
                    name, 
                    latitude, 
                    longitude
                ),
                pricing:pricing_configs (*)
            `);

        if (error) throw error;

        if (!data) return [];

        // Filter routes where the source state matches the requested state
        const stateRoutes = data.filter((r: any) => {
            const sourceState = (r.source as any)?.district?.state?.name;
            return sourceState === stateName;
        });

        return stateRoutes.map(mapSupabaseToUnifiedRoute);
    } catch (err) {
        console.error(`Supabase fetch failed for ${stateName}:`, err);
        return [];
    }
};
