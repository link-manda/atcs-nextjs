import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Only allow bulelengkab shinobi proxy
  if (!targetUrl.includes('shinobi.bulelengkab.go.id')) {
    return new NextResponse('Forbidden target URL', { status: 403 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'ATCS-Next-Proxy/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Target responded with ${response.status}`, { status: response.status });
    }

    let html = await response.text();

    // 1. Sanitize urlPrefix in Shinobi embed script so websocketPath evaluates to relative '/socket.io'
    html = html.replace(/var urlPrefix = `[^`]*`;/g, 'var urlPrefix = `/`;');

    // 2. Inject bulletproof interceptor for window.io to enforce valid path and domain
    const injection = `
<script>
  (function() {
    var _origIo = window.io;
    window.io = function(url, opts) {
      opts = opts || {};
      opts.path = '/socket.io';
      url = 'https://shinobi.bulelengkab.go.id';
      return _origIo(url, opts);
    };
  })();
</script>
    `;

    // Inject immediately after the socket.io script loads
    html = html.replace(
      '<script src="https://shinobi.bulelengkab.go.id/assets/vendor/js/socket.io.min.js"></script>',
      '<script src="https://shinobi.bulelengkab.go.id/assets/vendor/js/socket.io.min.js"></script>\n' + injection
    );

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Shinobi Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
