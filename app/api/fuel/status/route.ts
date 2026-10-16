import { NextResponse } from 'next/server';
import { aggregateBFWReports, BFWResponse } from '@/lib/fuel-utils';
import spbuMapping from '@/data/spbu-bfw-mapping.json';

// In-memory serverless cache
// ponytail: native module-level variables for 60s cache, no Redis/external DB
let cachedData: any = null;
let lastFetchedAt: number = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const revalidate = 60;

export async function GET() {
  const now = Date.now();

  if (cachedData && now - lastFetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  try {
    const upstreamUrl = 'https://balifuelwatch.vercel.app/api/reports?w=recent&f=2';
    const res = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ATCS-Bali-Command-Center/1.0',
      },
      // Next.js fetch revalidation
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }

    const json: BFWResponse = await res.json();
    const rows = json.rows || [];

    const statusMap = aggregateBFWReports(rows, spbuMapping.bfw_to_spbu as Record<number, string>);

    // Construct response containing status keyed by both BFW station ID and OSM SPBU ID
    // so client can look up directly using either key
    const spbuStatusMap: Record<string, any> = {};
    for (const [stationIdStr, status] of Object.entries(statusMap)) {
      if (status.spbu_id) {
        spbuStatusMap[status.spbu_id] = status;
      }
    }

    const payload = {
      updated_at: Math.floor(now / 1000),
      total_stations_reported: Object.keys(statusMap).length,
      stations: statusMap,
      by_spbu_id: spbuStatusMap,
    };

    cachedData = payload;
    lastFetchedAt = now;

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache-Status': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Fuel API] Error fetching reports from Bali Fuel Watch:', error);

    // If cache exists even if expired, return it as fallback (graceful degradation)
    if (cachedData) {
      return NextResponse.json(
        {
          ...cachedData,
          is_stale: true,
        },
        {
          headers: {
            'X-Cache-Status': 'STALE-FALLBACK',
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch fuel status from upstream',
        updated_at: Math.floor(now / 1000),
        stations: {},
        by_spbu_id: {},
      },
      { status: 502 }
    );
  }
}
