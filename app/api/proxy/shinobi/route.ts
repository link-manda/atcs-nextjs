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

    // Inject our fix for the socket.io duplicate URL bug in bs5.embed.js
    const injection = `
<script>
  // ATCS Next Fix: Intercept socket.io initialization to fix duplicate URL from absolute path bug
  const _origIo = window.io;
  window.io = function(url, opts) {
    if (opts && opts.path && opts.path.startsWith('http')) {
      opts.path = '/socket.io'; // Force relative path
      url = 'https://shinobi.bulelengkab.go.id'; // Set correct origin
    }
    return _origIo(url, opts);
  };
</script>
    `;

    // Inject immediately after the socket.io script loads
    html = html.replace(
      '<script src="https://shinobi.bulelengkab.go.id/assets/vendor/js/socket.io.min.js"></script>',
      '<script src="https://shinobi.bulelengkab.go.id/assets/vendor/js/socket.io.min.js"></script>\\n' + injection
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
