#!/usr/bin/env python3
"""Render DueDateHQ change cards to 1080x1440 PNGs.

    python3 export.py samples.json out/
    python3 export.py samples.json out/ --scale 2   # 2160x2880

Requires: pip install playwright && python3 -m playwright install chromium
"""
import argparse
import functools
import http.server
import json
import pathlib
import socketserver
import threading

HERE = pathlib.Path(__file__).parent.resolve()

RENDER = """async (d) => {
  const { renderCard } = await import('./card.js');
  const { buildCaption } = await import('./caption.js');
  const root = document.getElementById('root');
  root.innerHTML = '';
  root.appendChild(await renderCard(d));
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return buildCaption(d);
}"""


def serve(port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                directory=str(HERE))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('payload')
    ap.add_argument('outdir')
    ap.add_argument('--scale', type=int, default=1)
    ap.add_argument('--port', type=int, default=8899)
    a = ap.parse_args()

    items = json.loads(pathlib.Path(a.payload).read_text())
    if isinstance(items, dict):
        items = [items]
    out = pathlib.Path(a.outdir)
    out.mkdir(parents=True, exist_ok=True)

    httpd = serve(a.port)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(viewport={'width': 1180, 'height': 1560},
                         device_scale_factor=a.scale)
        pg.goto(f'http://127.0.0.1:{a.port}/export.html')
        for i, d in enumerate(items):
            cap = pg.evaluate(RENDER, d)
            pg.wait_for_timeout(400)
            name = d.get('id') or f'card-{i+1}'
            path = out / f'{name}.png'
            box = pg.locator('.ddhq').bounding_box()
            pg.locator('.ddhq').screenshot(path=str(path))
            (out / f'{name}.txt').write_text(cap['text'], encoding='utf-8')
            w, h = int(box['width']) * a.scale, int(box['height']) * a.scale
            flag = '  !! ' + '; '.join(cap['warnings']) if cap['warnings'] else ''
            print(f'{path}  {w}x{h}  +caption{flag}')
        br.close()
    httpd.shutdown()


if __name__ == '__main__':
    main()
