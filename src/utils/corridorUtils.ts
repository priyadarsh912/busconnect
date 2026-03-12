// src/utils/corridorUtils.ts

// Helper to calculate distance between two coordinates in km (Haversine formula)
export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Common city coordinates for distance validation fallback
export const CITY_COORDS: Record<string, [number, number]> = {
    "Chandigarh": [30.7333, 76.7794],
    "Mohali": [30.7046, 76.7179],
    "Zirakpur": [30.6425, 76.8173],
    "Rajpura": [30.4851, 76.5936],
    "Sirhind": [30.6353, 76.3980],
    "Khanna": [30.7015, 76.2234],
    "Ludhiana": [30.9000, 75.8573],
    "Ambala": [30.3782, 76.7767],
    "Kurukshetra": [29.9695, 76.8227],
    "Karnal": [29.6857, 76.9905],
    "Panipat": [29.3909, 76.9708],
    "Delhi": [28.6139, 77.2090],
    "Kalka": [30.8354, 76.9389],
    "Solan": [30.9045, 77.0967],
    "Shimla": [31.1048, 77.1734],
    "Jalandhar": [31.3260, 75.5762],
    "Beas": [31.5140, 75.2917],
    "Amritsar": [31.6340, 74.8723],
    "Ropar": [30.9639, 76.5267],
    "Patiala": [30.3398, 76.3869],
    "Bathinda": [30.2110, 74.9455],
    "Hoshiarpur": [31.5143, 75.9115],
    "Pathankot": [32.2643, 75.6522],
    "Ferozepur": [30.9235, 74.6148],
    "Moga": [30.8178, 75.1699],
    "Kapurthala": [31.3808, 75.3800],
    "Sector 43 Bus Stand": [30.7250, 76.7460],
    "Sector 17": [30.7398, 76.7827],
    "Sector 35": [30.7285, 76.7562],
    "Sector 43": [30.7250, 76.7460],
    "Balongi": [30.7042, 76.7051],
    "Kharar": [30.7483, 76.6414],
    "Kharar Bus Stand": [30.7483, 76.6414],
    "Landran": [30.6865, 76.6667],
    "Kurali": [30.8222, 76.5744],
    "Sohana": [30.6853, 76.7215],
    "Chhappar Chiri": [30.7032, 76.6715],
    "ISBT 17": [30.7398, 76.7827],
    "ISBT 43": [30.7250, 76.7460],
    "PGI": [30.7670, 76.7770],
    "Cantonment": [30.6900, 76.8500],
};

const CORRIDORS = {
    // NH44 North Corridor
    "NH44_NORTH": ["Delhi", "Panipat", "Karnal", "Kurukshetra", "Ambala", "Zirakpur", "Chandigarh", "Mohali", "Rajpura", "Sirhind", "Khanna", "Ludhiana", "Jalandhar", "Beas", "Amritsar", "Pathankot"],
    // NH44 South Corridor (Specific defined in prompt, overlapped by superset above, but let's define explicitly as requested)
    "NH44_SOUTH": ["Chandigarh", "Ambala", "Kurukshetra", "Karnal", "Panipat", "Delhi"],
    // NH5 Hill Corridor
    "NH5_HILL": ["Chandigarh", "Kalka", "Solan", "Shimla"],
    // NH3 Punjab Corridor
    "NH3_PUNJAB": ["Chandigarh", "Ludhiana", "Jalandhar", "Beas", "Amritsar"]
};

// Aliases for better destination matching
const ALIASES: Record<string, string> = {
    "Sector 17": "Chandigarh",
    "Sector 43": "Chandigarh",
    "ISBT 17": "Chandigarh",
    "Sector 43 Bus Stand": "Chandigarh",
    "Phase 5": "Mohali",
    "Phase 6": "Mohali",
};

const resolveCity = (stop: string) => {
    return ALIASES[stop] || stop;
};

// Finds if start and end are in any predefined corridor, and returns the segment between them
const getCorridorSegment = (startCity: string, endCity: string): string[] | null => {
    for (const [corridorName, cities] of Object.entries(CORRIDORS)) {
        const startIndex = cities.indexOf(startCity);
        const endIndex = cities.indexOf(endCity);

        if (startIndex !== -1 && endIndex !== -1) {
            // They belong to the same corridor
            if (startIndex < endIndex) {
                // Moving forward in array
                return cities.slice(startIndex + 1, endIndex);
            } else {
                // Moving backward in array
                return cities.slice(endIndex + 1, startIndex).reverse();
            }
        }
    }
    return null;
}

export const validateStops = (startOriginal: string, endOriginal: string, proposedStops: string[]): string[] => {
    if (!startOriginal || !endOriginal) return proposedStops.filter(s => !!s);

    let start = resolveCity(startOriginal);
    let end = resolveCity(endOriginal);

    // 1. Check Predefined Corridors
    const corridorSegment = getCorridorSegment(start, end);

    if (corridorSegment !== null) {
        // Return exactly the corridor stops between origin and destination
        if (corridorSegment.length <= 2) {
            return corridorSegment;
        } else {
            const mid = Math.floor(corridorSegment.length / 2);
            return [corridorSegment[0], corridorSegment[mid]];
        }
    }

    // 2. Geographical Reordering & Distance Validation
    // Sort proposed stops by their distance from the start point to ensure a logical sequence
    const startCoords = CITY_COORDS[start];
    const endCoords = CITY_COORDS[end];

    if (!startCoords || !endCoords) return proposedStops.filter(s => !!s);

    const stopsWithData = proposedStops
        .filter(s => !!s)
        .map(s => {
            const city = resolveCity(s);
            const coords = CITY_COORDS[city] || CITY_COORDS[s] || null;
            const distFromStart = coords ? getDistanceKm(startCoords[0], startCoords[1], coords[0], coords[1]) : 999999;
            return { original: s, distFromStart, coords };
        });

    // Sort by distance from start
    stopsWithData.sort((a, b) => a.distFromStart - b.distFromStart);

    const validStops: string[] = [];
    let currentDistanceToEnd = getDistanceKm(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);

    for (const item of stopsWithData) {
        if (!item.coords) {
            validStops.push(item.original);
            continue;
        }

        const newDistanceToEnd = getDistanceKm(item.coords[0], item.coords[1], endCoords[0], endCoords[1]);

        // Basic filtering: stop must be closer to destination than the origin was
        // AND not further than the destination itself (to avoid extreme overshoot)
        if (newDistanceToEnd < currentDistanceToEnd) {
            validStops.push(item.original);
            // We don't strictly update currentDistanceToEnd here because OSRM handles the exact path,
            // we just want to filter out points that are obviously in the wrong direction.
            // But we update it to ensure the NEXT stop is even closer.
            currentDistanceToEnd = newDistanceToEnd;
        }
    }

    return validStops;
};
