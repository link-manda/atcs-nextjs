import fs from 'fs';
import path from 'path';

interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    operator?: string;
    brand?: string;
    'addr:city'?: string;
    'addr:street'?: string;
    [key: string]: string | undefined;
  };
}

export interface SPBUNode {
  id: string | number;
  name: string;
  operator?: string;
  brand?: string;
  lat: number;
  lng: number;
  regency?: string;
  street?: string;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const BALI_BBOX = '-8.95,114.40,-8.00,115.75';

const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  node["amenity"="fuel"](${BALI_BBOX});
  way["amenity"="fuel"](${BALI_BBOX});
);
out center tags;
`;

async function fetchFromOverpass(): Promise<OverpassElement[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[SPBU-FETCH] Trying Overpass endpoint: ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'BaliCommandCenter/1.0 (ATCS Next SPBU Matcher)',
        },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.elements)) {
          console.log(`[SPBU-FETCH] Successfully fetched ${json.elements.length} elements from ${endpoint}`);
          return json.elements;
        }
      } else {
        console.warn(`[SPBU-FETCH] ${endpoint} returned status ${response.status}`);
      }
    } catch (err: any) {
      console.warn(`[SPBU-FETCH] Failed querying ${endpoint}: ${err.message}`);
    }
  }
  throw new Error('All Overpass API endpoints failed');
}

function normalizeSPBUData(elements: OverpassElement[]): SPBUNode[] {
  const result: SPBUNode[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (!lat || !lng) continue;

    const tags = el.tags || {};
    const brand = tags.brand || tags.operator || 'Pertamina';
    let name = tags.name;

    if (!name) {
      const street = tags['addr:street'] ? ` ${tags['addr:street']}` : '';
      name = `SPBU ${brand}${street}`.trim();
    }

    result.push({
      id: `${el.type[0]}${el.id}`,
      name,
      operator: tags.operator || tags.brand,
      brand: tags.brand,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      regency: tags['addr:city'],
      street: tags['addr:street'],
    });
  }

  // Ensure SPBU Setiabudi (Wibisana) is properly present if not discovered by generic name
  const setiabudiFound = result.some(
    s => Math.abs(s.lat - (-8.6506)) < 0.002 && Math.abs(s.lng - 115.209) < 0.002
  );

  if (!setiabudiFound) {
    console.log('[SPBU-FETCH] Adding verified SPBU Pertamina Setiabudi (Simpang Wibisana)');
    result.push({
      id: 'manual-setiabudi-wibisana',
      name: 'SPBU Pertamina 54.801.06 Setiabudi',
      operator: 'Pertamina',
      brand: 'Pertamina',
      lat: -8.65012,
      lng: 115.20915,
      regency: 'Denpasar',
      street: 'Jl. Setiabudi',
    });
  }

  return result;
}

async function main() {
  try {
    const rawElements = await fetchFromOverpass();
    const normalized = normalizeSPBUData(rawElements);

    const outputPath = path.resolve(process.cwd(), 'data/bali-spbu.json');
    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`[SPBU-FETCH] Saved ${normalized.length} SPBU points to ${outputPath}`);
  } catch (err: any) {
    console.error('[SPBU-FETCH] Error running script:', err.message);
    process.exit(1);
  }
}

main();
