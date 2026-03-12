import * as XLSX from 'xlsx';
import { validateStops } from './corridorUtils';

export interface RadarBus {
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
    route_polyline?: [number, number][];
}

export const loadRadarBuses = async (): Promise<RadarBus[]> => {
    try {
        const response = await fetch('/datasets/bus_routes_realistic_5000.xlsx');
        if (!response.ok) throw new Error('Failed to fetch radar dataset');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Strict filtering for outstation only
        return data
            .filter(row => String(row['route_type']).toLowerCase() === 'outstation')
            .map((row) => {
                const start_stop = String(row['start_stop'] || '');
                const end_stop = String(row['end_stop'] || '');
                const rawStops = [String(row['stop_1'] || ''), String(row['stop_2'] || '')];
                const validated = validateStops(start_stop, end_stop, rawStops);

                return {
                    route_id: String(row['route_id'] || ''),
                    start_stop,
                    stop_1: validated.length > 0 ? validated[0] : '',
                    stop_2: validated.length > 1 ? validated[1] : '',
                    end_stop,
                    distance_km: Number(row['distance_km'] || 0),
                    eta_min: Number(row['eta_min'] || 0),
                    price_inr: Number(row['price_inr'] || 0),
                    crowd: String(row['crowd'] || 'Low'),
                    operator: (() => {
                        // 40% Punjab Roadways, 30% Haryana Roadways, 20% PRTC, 10% Private Volvo
                        const rand = Math.random();
                        if (rand < 0.40) return 'Punjab Roadways';
                        if (rand < 0.70) return 'Haryana Roadways';
                        if (rand < 0.90) return 'PRTC';
                        return 'Private Volvo';
                    })(),
                    route_type: String(row['route_type'] || 'outstation'),
                    start_lat: Number(row['start_lat'] || 0),
                    start_lon: Number(row['start_lon'] || 0),
                    end_lat: Number(row['end_lat'] || 0),
                    end_lon: Number(row['end_lon'] || 0),
                    highway: String(row['highway'] || (
                        String(row['end_stop']).includes('Delhi') ? 'NH44' :
                            String(row['end_stop']).includes('Shimla') ? 'NH5' :
                                String(row['end_stop']).includes('Amritsar') ? 'NH44' :
                                    String(row['end_stop']).includes('Pathankot') ? 'NH44' : 'NH7'
                    ))
                };
            });
    } catch (error) {
        console.error('Error loading radar buses:', error);
        return [];
    }
};
