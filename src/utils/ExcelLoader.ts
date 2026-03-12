import * as XLSX from 'xlsx';

export type RouteEntry = {
    route_no: string;
    from_stop: string;
    stop: string;
    to_stop: string;
    distance_km: number;
    eta_min: number;
    price_inr: number;
    crowd: string;
    lat_from: number;
    lon_from: number;
    lat_stop: number;
    lon_stop: number;
    lat_to: number;
    lon_to: number;
};

const calculateFare = (distance: number): number => {
    if (distance <= 5) return 10;
    if (distance <= 10) return 20;
    if (distance <= 20) return 30;
    return 40 + Math.floor(distance - 20);
};

export const loadBusRoutes = async (): Promise<RouteEntry[]> => {
    try {
        const response = await fetch('/datasets/tricity_bus_routes_3000.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        return data.map((row) => {
            const distance = Number(row.distance_km || 0);
            return {
                route_no: String(row.route_no || ''),
                from_stop: String(row.from_stop || ''),
                stop: String(row.stop || ''),
                to_stop: String(row.to_stop || ''),
                distance_km: distance,
                eta_min: Number(row.eta_min || 0),
                price_inr: calculateFare(distance),
                crowd: String(row.crowd || 'Low'),
                lat_from: Number(row.lat_from || 0),
                lon_from: Number(row.lon_from || 0),
                lat_stop: Number(row.lat_stop || 0),
                lon_stop: Number(row.lon_stop || 0),
                lat_to: Number(row.lat_to || 0),
                lon_to: Number(row.lon_to || 0),
            };
        });
    } catch (error) {
        console.error('Error loading bus routes:', error);
        return [];
    }
};
