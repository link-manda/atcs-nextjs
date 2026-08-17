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

    // 1. Inject local state-machine mock for socket.io to trigger Shinobi video initialization
    const injection = `
<style>
  html, body, #monitors_live, .stream-element-container, .monitor_item, .stream-block {
    background: #000 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .stream-element {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    background: #000 !important;
  }
  .unmute-embed-audio {
    position: absolute !important;
    top: 10px !important;
    left: 10px !important;
    z-index: 99 !important;
    background: rgba(0,0,0,0.6) !important;
    color: #fff !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    padding: 4px 8px !important;
    font-size: 11px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    backdrop-filter: blur(4px) !important;
  }
</style>
<script>
  (function() {
    // Enable Turbo JPEG Stream Mode to eliminate video buffer underrun/stalling on low-FPS feeds
    window.jpegModeOn = true;
    if (typeof monitorConfig !== 'undefined' && monitorConfig.details) {
      monitorConfig.details.jpegInterval = 2;
    }

    window.io = function() {
      var listeners = {};
      var socket = {
        connected: true,
        on: function(event, cb) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
          if (event === 'connect') {
            setTimeout(function() {
              cb({});
            }, 10);
          }
          return socket;
        },
        emit: function(event, data) {
          if (event === 'f' && data) {
            if (data.f === 'init') {
              setTimeout(function() {
                var fListeners = listeners['f'] || [];
                fListeners.forEach(function(fn) {
                  fn({ f: 'init_success' });
                });
              }, 20);
            } else if (data.f === 'monitor' && data.ff === 'watch_on') {
              setTimeout(function() {
                var mid = data.id || (typeof monitorId !== 'undefined' ? monitorId : 'default');
                var fListeners = listeners['f'] || [];
                fListeners.forEach(function(fn) {
                  fn({ f: 'monitor_watch_on', mid: mid, id: mid });
                });
              }, 30);
            }
          }
          return socket;
        },
        off: function() { return socket; },
        f: function(data, cb) {
          socket.emit('f', data);
          if (cb) cb({ ok: true });
          return socket;
        },
        disconnect: function() { return socket; }
      };
      return socket;
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
