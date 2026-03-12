import { loadRadarBuses, RadarBus } from '../utils/RadarLoader';
import { loadBusRoutes, RouteEntry } from '../utils/ExcelLoader';
import { loadDelhiUPRoutes, DelhiUPRoute } from './loadDelhiUPRoutes';

export type UnifiedRoute = RadarBus;

export const stateDatasets: Record<string, {
    intercity: () => Promise<any[]>,
    outstation: () => Promise<RadarBus[]>
}> = {
    "Chandigarh": {
        intercity: async () => await loadBusRoutes(),
        outstation: async () => {
            const routes = await loadRadarBuses();
            return routes.filter(r =>
                (r.start_stop && r.start_stop.includes("Chandigarh")) ||
                (r.end_stop && r.end_stop.includes("Chandigarh"))
            );
        }
    },
    "Punjab": {
        intercity: async () => await loadBusRoutes(),
        outstation: async () => {
            const routes = await loadRadarBuses();
            return routes.filter(r =>
                ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Pathankot", "Ferozepur", "Moga", "Kapurthala"]
                    .includes(r.start_stop) ||
                ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Pathankot", "Ferozepur", "Moga", "Kapurthala"]
                    .includes(r.end_stop)
            );
        }
    },
    "Haryana": {
        intercity: async () => await loadBusRoutes(),
        outstation: async () => {
            const routes = await loadRadarBuses();
            return routes.filter(r => r.operator === "Haryana Roadways" || r.highway === "NH44");
        }
    },
    "Delhi": {
        intercity: async () => [], // No intercity dataset for Delhi yet
        outstation: async () => {
            const routes = await loadDelhiUPRoutes("Delhi");
            return routes.map(mapToRadarBus);
        }
    },
    "Uttar Pradesh": {
        intercity: async () => [], // No intercity dataset for UP yet
        outstation: async () => {
            const routes = await loadDelhiUPRoutes("Uttar Pradesh");
            return routes.map(mapToRadarBus);
        }
    }
};

function mapToRadarBus(route: DelhiUPRoute): RadarBus {
    return {
        route_id: route.route_id,
        start_stop: route.from_city,
        stop_1: route.stop_1,
        stop_2: route.stop_2,
        end_stop: route.to_city,
        distance_km: route.distance_km,
        eta_min: route.eta_min,
        price_inr: route.price_inr,
        crowd: route.crowd,
        operator: route.operator,
        route_type: "outstation",
        start_lat: route.origin_lat,
        start_lon: route.origin_lon,
        end_lat: route.destination_lat,
        end_lon: route.destination_lon,
        highway: route.to_city.includes("Delhi") ? "NH44" : "NH19"
    };
}

export const getRoutesForState = async (stateName: string, tripType: "intercity" | "outstation" = "outstation"): Promise<any[]> => {
    const stateEntry = stateDatasets[stateName];
    if (stateEntry) {
        return await stateEntry[tripType]();
    }
    return [];
};
