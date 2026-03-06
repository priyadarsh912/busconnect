import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFilePath = path.join(__dirname, '../../chandigarh_bus_realistic_ml_data_500.xlsx');
const outputFilePath = path.join(__dirname, '../src/data/bus-routes.json');

console.log(`Reading Excel file from: ${inputFilePath}`);

try {
    // Read the workbook
    const workbook = xlsx.readFile(inputFilePath);

    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    console.log(`Processing sheet: ${sheetName}`);

    // Convert sheet to JSON array
    // We use raw:false to ensure formatted dates/times if any
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

    // Transform and clean the data for our frontend
    const formattedRoutes = rawData.map((row, index) => {
        // Determine crowd level based on "Occupancy Level" string (e.g. "Low", "Moderate", "High")
        const occupancyStr = (row['Occupancy Level'] || 'Low').toString().toLowerCase();

        let crowd = 'low';
        if (occupancyStr.includes('high') || occupancyStr.includes('busy')) crowd = 'busy';
        else if (occupancyStr.includes('moderate') || occupancyStr.includes('medium')) crowd = 'moderate';

        // Determine seats left based on "Bus Capacity" - "Passenger Count"
        const capacity = parseInt(row['Bus Capacity']) || 40;
        const passengers = parseInt(row['Passenger Count']) || 0;
        const seatsLeft = Math.max(0, capacity - passengers);

        const routeIdStr = row['Route ID']?.toString() || '101';
        const numId = parseInt(routeIdStr.replace(/\D/g, '')) || index + 1;

        // New ML dataset includes real Departure Time, Arrival Time, and Time Taken (minutes)
        const rawDeparture = row['Departure Time'] || '08:00';
        const rawArrival = row['Arrival Time'] || '09:00';

        // Format times (e.g., 13:00 -> 01:00 PM)
        const formatTime = (timeStr) => {
            const parts = timeStr.toString().split(':');
            if (parts.length < 2) return timeStr;
            let hours = parseInt(parts[0]);
            const mins = parts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
        };

        const departure = formatTime(rawDeparture);
        const arrival = formatTime(rawArrival);

        // Duration
        const minutes = parseInt(row['Time Taken (minutes)']) || 60;
        const durationHours = Math.floor(minutes / 60);
        const durationMins = minutes % 60;
        const duration = durationHours > 0 ? `${durationHours}H ${durationMins}M` : `${durationMins}M`;

        // Map 'Historical Demand' column to price with a +100 offset
        // This matches the user's expected fares (e.g. Demand 40 -> Price 140)
        let demandVal = parseInt(row['Historical Demand']) || 0;
        const price = demandVal + 100;

        return {
            id: index + 1,
            routeId: row['Route ID'],
            name: `Route ${row['Route ID']} Express`,
            from: row['From']?.trim() || 'Unknown Origin',
            to: row['To']?.trim() || 'Unknown Destination',
            rating: (4 + (numId % 10) / 10).toFixed(1), // e.g., 4.2
            reviews: `${(100 + (numId * 7) % 900)}`,
            price: price,
            crowd: crowd,
            departure: departure,
            arrival: arrival,
            duration: duration,
            status: (numId % 3 === 0) ? "15 min late" : "On time",
            seatsLeft: seatsLeft > 0 ? seatsLeft : null,
            dayOfWeek: parseInt(row['Day of Week']) || 1
        };
    });

    // Ensure the output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to output file
    fs.writeFileSync(outputFilePath, JSON.stringify(formattedRoutes, null, 2));
    console.log(`Successfully generated dynamic route data at: ${outputFilePath}`);
    console.log(`Total routes processed: ${formattedRoutes.length}`);

} catch (error) {
    console.error("Error processing Excel file:", error);
}
