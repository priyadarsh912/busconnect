import * as XLSX from 'xlsx';

export interface DelhiUPRoute {
    route_id: string;
    bus_number: string;
    from_city: string;
    to_city: string;
    distance_km: number;
    origin_lat: number;
    origin_lon: number;
    destination_lat: number;
    destination_lon: number;
    state: "Delhi" | "Uttar Pradesh";
    stop_1: string;
    stop_2: string;
    eta_min: number;
    price_inr: number;
    crowd: string;
    operator: string;
}

const UP_CITIES = ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida", "Ghaziabad"];

export const loadDelhiUPRoutes = async (targetState: "Delhi" | "Uttar Pradesh"): Promise<DelhiUPRoute[]> => {
    try {
        const response = await fetch('/datasets/delhi_outstation_routes_5000.xlsx');
        if (!response.ok) throw new Error('Failed to fetch Delhi/UP dataset');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        return data
            .map((row) => {
                const state = String(row.state || "").trim();
                const fromCity = String(row.start_stop || "").trim();

                return {
                    route_id: String(row.route_id || ""),
                    bus_number: String(row.route_id || ""), // Using route_id as bus_number
                    from_city: fromCity,
                    to_city: String(row.end_stop || "").trim(),
                    distance_km: Number(row.distance_km || 0),
                    origin_lat: Number(row.start_lat || 0),
                    origin_lon: Number(row.start_lon || 0),
                    destination_lat: Number(row.end_lat || 0),
                    destination_lon: Number(row.end_lon || 0),
                    state: (state === "Delhi" || state === "Uttar Pradesh") ? state : "Delhi",
                    stop_1: String(row.stop_1 || ""),
                    stop_2: String(row.stop_2 || ""),
                    eta_min: Number(row.eta_min || 0),
                    price_inr: Number(row.price_inr || 0),
                    crowd: String(row.crowd || "Low"),
                    operator: String(row.operator || "Unknown")
                };
            })
            .filter((route) => {
                if (targetState === "Delhi") {
                    return route.from_city === "Delhi" || route.state === "Delhi";
                } else if (targetState === "Uttar Pradesh") {
                    return UP_CITIES.includes(route.from_city) || route.state === "Uttar Pradesh";
                }
                return false;
            }) as DelhiUPRoute[];
    } catch (error) {
        console.error(`Error loading routes for ${targetState}:`, error);
        return [];
    }
};
