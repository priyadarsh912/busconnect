import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
// You must set these in your terminal before running:
// $env:SUPABASE_URL="your-url"
// $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrate() {
  console.log('🚀 Starting BusConnect Migration to Supabase...');

  try {
    // 1. Initial Data: Default State & District
    const { data: stateData, error: stateErr } = await supabase
      .from('states')
      .upsert({ name: 'Punjab', code: 'PB' })
      .select()
      .single();

    if (stateErr) throw stateErr;
    console.log('✅ State Punjab created');

    const { data: districtData, error: distErr } = await supabase
      .from('districts')
      .upsert({ state_id: stateData.id, name: 'Chandigarh' })
      .select()
      .single();

    if (distErr) throw distErr;
    console.log('✅ District Chandigarh created');

    // 2. Load Excel Data (Tricity Routes)
    const excelPath = path.resolve(__dirname, '../public/datasets/tricity_bus_routes_3000.xlsx');
    if (fs.existsSync(excelPath)) {
      console.log('📊 Processing Excel Data...');
      const workbook = XLSX.readFile(excelPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      for (const row of rows) {
        // Create Stops
        const fromStop = await upsertStop(row.from_stop, row.lat_from, row.lon_from, districtData.id);
        const toStop = await upsertStop(row.to_stop, row.lat_to, row.lon_to, districtData.id);
        
        // Create Route
        const { data: route, error: rErr } = await supabase
          .from('routes')
          .upsert({
            name: `${row.from_stop} to ${row.to_stop} (${row.route_no})`,
            source_stop_id: fromStop.id,
            destination_stop_id: toStop.id,
            distance_km: Number(row.distance_km || 0),
            base_fare: Number(row.price_inr || 10)
          })
          .select()
          .single();

        if (rErr) continue;

        // Create Pricing Config
        await supabase.from('pricing_configs').upsert({
          route_id: route.id,
          price_per_km: 1.5,
          surge_multiplier: 1.0,
          min_fare: 10.0
        });

        // Add intermediate stop if exists
        if (row.stop) {
          const midStop = await upsertStop(row.stop, row.lat_stop, row.lon_stop, districtData.id);
          await supabase.from('route_stops').upsert([
            { route_id: route.id, stop_id: fromStop.id, stop_order: 1 },
            { route_id: route.id, stop_id: midStop.id, stop_order: 2 },
            { route_id: route.id, stop_id: toStop.id, stop_order: 3 }
          ]);
        }
      }
      console.log(`✅ Migrated ${rows.length} records from Excel`);
    }

    console.log('🏆 Migration Complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

async function upsertStop(name: string, lat: number, lon: number, districtId: string) {
  const { data, error } = await supabase
    .from('stops')
    .upsert({ 
        name: String(name), 
        latitude: Number(lat || 0), 
        longitude: Number(lon || 0),
        district_id: districtId 
    }, { onConflict: 'name' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

migrate();
