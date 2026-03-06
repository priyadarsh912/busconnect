import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPARSE_1 = [
    [30.7333, 76.7794], // ISBT 17
    [30.6950, 76.8000], // Tribune Chowk area
    [30.6425, 76.8173], // Zirakpur
    [30.6200, 76.8250], // Derabassi direction
];

const SPARSE_2 = [
    [30.7046, 76.7179], // Mohali
    [30.6850, 76.7500],
    [30.6425, 76.8173], // Zirakpur
    [30.6550, 76.8400], // Panchkula direction
];

const SPARSE_3 = [
    [30.6905, 76.8532], // Panchkula
    [30.6425, 76.8173], // Zirakpur
    [30.6000, 76.8100], // Ambala Highway
];

async function getOSRMRoute(coords, name) {
    const coordsString = coords.map(c => `${c[1]},${c[0]}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.routes && json.routes.length > 0) {
                        // OSRM returns [lng, lat], we need [lat, lng]
                        const path = json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                        console.log(`Fetched ${name}, points: ${path.length}`);
                        resolve({ name, path });
                    } else {
                        reject('No route found for ' + name);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log("Fetching curvy routes from OSRM...");
        const route1 = await getOSRMRoute(SPARSE_1, 'ROUTE_1');
        const route2 = await getOSRMRoute(SPARSE_2, 'ROUTE_2');
        const route3 = await getOSRMRoute(SPARSE_3, 'ROUTE_3');

        const dataDir = path.join(__dirname, '..', 'src', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const fileData = {
            ROUTE_1: route1.path,
            ROUTE_2: route2.path,
            ROUTE_3: route3.path
        };

        fs.writeFileSync(path.join(dataDir, 'busRoutes.json'), JSON.stringify(fileData, null, 2));
        console.log("Successfully wrote busRoutes.json with dense coordinate curves.");
    } catch (error) {
        console.error("Error generating routes:", error);
    }
}

main();
