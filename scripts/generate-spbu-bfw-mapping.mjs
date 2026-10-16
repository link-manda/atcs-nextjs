import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const spbuDataPath = path.join(rootDir, 'data', 'bali-spbu.json');
const outputPath = path.join(rootDir, 'data', 'spbu-bfw-mapping.json');

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function run() {
  console.log('Fetching Bali Fuel Watch station list...');
  const res = await fetch('https://balifuelwatch.vercel.app/');
  const html = await res.text();
  const match = html.match(/const\s+STATIONS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('STATIONS array not found in Bali Fuel Watch homepage HTML');
  }

  const bfwStations = JSON.parse(match[1]);
  console.log(`Loaded ${bfwStations.length} Bali Fuel Watch stations.`);

  const localSpbu = JSON.parse(fs.readFileSync(spbuDataPath, 'utf8'));
  console.log(`Loaded ${localSpbu.length} local SPBU nodes.`);

  // Map each local SPBU node to the nearest BFW station within 50m
  // Also create a reverse map: bfw_id -> local SPBU node id
  const spbuToBfw = {};
  const bfwToSpbu = {};

  let mappedCount = 0;

  for (const bfw of bfwStations) {
    let nearest = null;
    let minDist = Infinity;

    for (const spbu of localSpbu) {
      if (spbu.lat == null || spbu.lng == null) continue;
      const d = haversine(bfw.lat, bfw.lon, spbu.lat, spbu.lng);
      if (d < minDist && d <= 100) {
        minDist = d;
        nearest = spbu;
      }
    }

    if (nearest) {
      mappedCount++;
      spbuToBfw[nearest.id] = {
        bfw_id: bfw.id,
        distance_meters: minDist,
        bfw_name: bfw.name,
      };
      bfwToSpbu[bfw.id] = nearest.id;
    } else {
      console.warn(`Station without local match: ID ${bfw.id} (${bfw.name}) at ${bfw.lat}, ${bfw.lon}`);
    }
  }

  console.log(`Successfully mapped ${mappedCount}/${bfwStations.length} BFW stations to local SPBUs.`);

  const mappingResult = {
    generated_at: new Date().toISOString(),
    total_bfw_stations: bfwStations.length,
    mapped_stations: mappedCount,
    spbu_to_bfw: spbuToBfw,
    bfw_to_spbu: bfwToSpbu,
  };

  fs.writeFileSync(outputPath, JSON.stringify(mappingResult, null, 2), 'utf8');
  console.log(`Wrote mapping file to ${outputPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
