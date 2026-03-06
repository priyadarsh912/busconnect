import * as XLSX from 'xlsx';

export type OutstationRouteEntry = {
    route_no: string;
    start_city: string;
    stop_city: string;
    end_city: string;
    distance_km: number;
    price: number;
    eta: string;
    bus_number: string;
    crowd: string;
};

export const loadOutstationRoutes = async (): Promise<OutstationRouteEntry[]> => {
    try {
        const response = await fetch('/outstation_routes.json');
        if (!response.ok) throw new Error('Failed to fetch outstation dataset');

        const data: OutstationRouteEntry[] = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading outstation routes:', error);
        return [];
    }
};
