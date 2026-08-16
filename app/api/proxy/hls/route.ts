import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0',
    };

    if (targetUrl.startsWith('https://atcs.denpasarkota.go.id')) {
      headers['Referer'] = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      headers['x-client-id'] = 'a194e6ae-d4dd-4b62-a0ac-388922f09303';
      headers['x-client-secret'] = 'f430fde38a031fb657a2a7d6f84644a9aed767a4c22314d4b7c565648acc2396';
    } else if (targetUrl.startsWith('https://transcode.baliprov.go.id')) {
      headers['Referer'] = 'https://transcode.baliprov.go.id/';
    }

    const upstreamResponse = await fetch(targetUrl, {
      cache: 'no-store',
      headers,
    });

    if (!upstreamResponse.ok) {
      return new NextResponse(`Upstream returned ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
      });
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const isM3U8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegURL');

    if (isM3U8) {
      const manifestText = await upstreamResponse.text();

      // Rewrite relative URLs in the m3u8 playlist to point through this proxy (including fMP4 Low-Latency tags)
      const rewrittenManifest = manifestText
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // 1. Rewrite URI="..." attributes in HLS tags (#EXT-X-MAP, #EXT-X-PART, #EXT-X-PRELOAD-HINT, etc.)
          if (trimmed.startsWith('#')) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const absoluteUrl = new URL(uri, targetUrl).toString();
                return `URI="/api/proxy/hls?url=${encodeURIComponent(absoluteUrl)}"`;
              } catch {
                return match;
              }
            });
          }

          // 2. Line is a plain URI reference (e.g. stream.m3u8, segment.ts, or segment.mp4)
          try {
            const absoluteUrl = new URL(trimmed, targetUrl).toString();
            return `/api/proxy/hls?url=${encodeURIComponent(absoluteUrl)}`;
          } catch {
            return line;
          }
        })
        .join('\n');

      return new NextResponse(rewrittenManifest, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Binary stream chunk (.ts video segment or .mp4 fragment)
    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const defaultContentType = targetUrl.endsWith('.mp4') ? 'video/mp4' : 'video/MP2T';
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || defaultContentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch (error: any) {
    console.error('[HLS Proxy] Fetch error:', error);
    return new NextResponse('Error fetching HLS resource', { status: 500 });
  }
}
