/* DueDateHQ change card renderer.
   renderCard(data) -> Promise<HTMLElement>
   See samples.json for the payload shape. */

const ICON_BASE = new URL('./icons/', import.meta.url).href;
const iconCache = new Map();

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let wordmarkCache;
/* 页脚 DueDateHQ 标识 = 官方 wordmark SVG(内联,渲染前就在 DOM 里)。 */
async function loadWordmark() {
  if (wordmarkCache === undefined) {
    wordmarkCache = fetch(new URL('./brand-wordmark.svg', import.meta.url).href)
      .then((r) => (r.ok ? r.text() : 'DueDateHQ'))
      .catch(() => 'DueDateHQ');
  }
  return wordmarkCache;
}

async function loadIcon(code) {
  if (!iconCache.has(code)) {
    iconCache.set(code, fetch(`${ICON_BASE}${code}.svg`).then((r) => {
      if (!r.ok) throw new Error(`no icon for ${code}`);
      return r.text();
    }));
  }
  return iconCache.get(code);
}

/* Paints the affected counties. Pass [] for a plain state silhouette. */
async function stateIcon(code, counties = []) {
  let svg = await loadIcon(code);
  svg = svg.replace(/var\(--icon-off,#D6D4CB\)/g, 'var(--map-off)');
  for (const fips of counties) {
    svg = svg.replace(`<path id="c${fips}"`,
      `<path fill="var(--map-on)" id="c${fips}"`);
  }
  return svg;
}

/* Paper grain. Rendered once, referenced by every card. */
function grainDefs() {
  if (document.getElementById('ddhq-grain-def')) return;
  const d = document.createElement('div');
  d.id = 'ddhq-grain-def';
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs>
    <filter id="ddhqGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.82"
        numOctaves="4" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
    </filter></defs></svg>`;
  document.body.appendChild(d);
}

const grainLayer = () =>
  `<svg class="ddhq__grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
     <rect width="100%" height="100%" filter="url(#ddhqGrain)"/></svg>`;

/* Highlighter band. Edges wobble so it reads as a marker stroke, not a rect. */
function highlighter(fill = 'var(--lime)') {
  return `<span class="ddhq__hl" aria-hidden="true">
    <svg viewBox="0 0 100 40" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <path fill="${fill}" d="M0.6 5.4C12 2.6 27 6.8 43 3.9C59.4 1 77 6.2 99.4 2.8
        L99.4 36.4C82 39.6 63 34.4 45 37.3C29 39.9 13.6 35.2 0.6 38.4Z"/>
    </svg></span>`;
}

function stampSvg({ date, time, label = 'DETECTED',
                    ink = 'var(--stamp-ink)', size = 188 }, uid) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"
    role="img" aria-label="${esc(label)} ${esc(date)} ${esc(time)}"
    xmlns="http://www.w3.org/2000/svg">
    <title>${esc(label)} ${esc(date)} ${esc(time)}</title>
    <defs><path id="ddhqArc${uid}" d="M 18 52 A 32 32 0 0 1 82 52" fill="none"/></defs>
    <circle cx="50" cy="50" r="47" fill="none" stroke="${ink}" stroke-width="1.5"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="${ink}" stroke-width="3"/>
    <text class="mono" font-size="8.6" fill="${ink}" letter-spacing="2.2"
      ><textPath href="#ddhqArc${uid}" startOffset="50%"
      text-anchor="middle">${esc(label)}</textPath></text>
    <line x1="18" y1="44" x2="82" y2="44" stroke="${ink}" stroke-width="1.2"/>
    <line x1="18" y1="74" x2="82" y2="74" stroke="${ink}" stroke-width="1.2"/>
    <text class="mono" x="50" y="61.5" font-size="19" fill="${ink}"
      text-anchor="middle">${esc(date)}</text>
    <text class="mono" x="50" y="71" font-size="8" fill="${ink}"
      text-anchor="middle" letter-spacing="1">${esc(time)}</text></svg>`;
}

let uidSeq = 0;

export async function renderCard(data) {
  grainDefs();
  const uid = ++uidSeq;
  const kind = data.kind || 'delay';
  const locale = data.locale || 'zh';
  const format = data.format || 'xhs';
  const isCorrection = kind === 'correction';

  const icon = data.map
    ? await stateIcon(data.map.state, data.map.counties || [])
    : '';

  const head = `<div class="ddhq__top">
    ${icon ? `<div class="ddhq__icon">${icon}</div>` : ''}
    <div>
      <div class="ddhq__srcline">
        <span class="ddhq__lvl">${esc(data.source.level)}</span>
        <span class="ddhq__org">${esc(data.source.org)}</span>
      </div>
      <div class="ddhq__why">${esc(data.reason)}</div>
    </div>
    <div class="ddhq__nid"><span class="mono">${esc(data.source.noticeId)}</span>${
      data.source.verified ? '<span style="color:var(--g2)"> ✓</span>' : ''
    }</div>
  </div>`;

  const titleInner = `<div class="ddhq__h">${
    (Array.isArray(data.title) ? data.title : [data.title])
      .map(esc).join('<br>')
  }</div>`;

  let body = '';
  if (kind === 'note') {
    /* 第 2 页:实务提示单独成页。编号要点,字号放大到整页可读。 */
    const pts = (data.points || []).map((p, i) =>
      `<div class="ddhq__np"><span class="ddhq__nn">${i + 1}</span>
         <span class="ddhq__nx">${esc(p)}</span></div>`).join('');
    body = `<div class="ddhq__notes">${pts}</div>`;
  } else if (kind === 'multi') {
    const all = data.rows || [];
    /* 版面容量：4 行常规，6 行紧凑，12 行双栏，超出则截断并注明。 */
    const CAP = 12;
    const shown = all.slice(0, CAP);
    const density = all.length <= 4 ? ''
      : all.length <= 6 ? ' ddhq__rows--compact'
      : ' ddhq__rows--two';
    const rows = await Promise.all(shown.map(async (r) => {
      const ic = await stateIcon(r.state, []);
      return `<div class="ddhq__r">
        <div class="ddhq__rs">${ic}<span>${esc(r.name)}</span>
          <span class="ddhq__rq">${esc(r.scope)}</span></div>
        <div class="ddhq__rd serif">${esc(r.date)}</div></div>`;
    }));
    const more = all.length > CAP
      ? `<div class="ddhq__more">${locale === 'en'
          ? `${all.length - CAP} more jurisdictions — see profile`
          : `另有 ${all.length - CAP} 个辖区，见主页合集`}</div>`
      : '';
    body = `<div class="ddhq__rows${density}">${rows.join('')}${more}</div>`;
  } else {
    const newSlot = kind === 'pending'
      ? `<span class="ddhq__pend serif">${esc(data.newDate || '日期待公布')}</span>`
      : `<span class="ddhq__new">${
          highlighter(isCorrection ? 'var(--red-pale)' : 'var(--lime)')
        }<span class="ddhq__newtx serif">${esc(data.newDate)}</span></span>`;

    const oldSlot = kind === 'pending'
      ? `<span class="ddhq__old serif" style="text-decoration:none;color:var(--ink)">${
          esc(data.oldDate)}</span>`
      : `<span class="ddhq__old serif">${esc(data.oldDate)}</span>`;

    body = `<div class="ddhq__lab">${esc(data.dateLabel)}</div>
      <div class="ddhq__dates">${oldSlot}
        <span class="ddhq__arw">&#8594;</span>${newSlot}</div>`;
  }

  const tags = kind !== 'note' && (data.forms || []).length
    ? `<div class="ddhq__tags">${data.forms.map((f) =>
        `<span class="ddhq__tag${/^[\d-]/.test(f) ? ' mono' : ''}">${esc(f)}</span>`
      ).join('')}</div>`
    : '';

  const tip = kind !== 'note' && data.tip
    ? `<div class="ddhq__tip"><div class="ddhq__tl">${esc(data.tip.label)}</div>
       <div class="ddhq__tb">${esc(data.tip.body)}</div></div>`
    : '';

  /* 补录的历史公告不能盖 DETECTED —— 那枚章宣称的是"我们第一时间发现了"。
     没有 detected 时改盖中性灰的 ON FILE，显示官方发布日，不显示时间。 */
  const mark = data.detected && data.detected.date
    ? { date: data.detected.date, time: data.detected.time,
        label: 'DETECTED',
        ink: isCorrection ? 'var(--red)' : 'var(--stamp-ink)',
        size: data.detected.size || 188 }
    : data.publishedAt
      ? { date: data.publishedAt, time: '', label: 'ON FILE',
          ink: 'var(--g1)', size: 188 }
      : null;

  const stamp = mark
    ? `<div class="ddhq__stamp"${
        data.detected?.position ? ` style="${data.detected.position}"` : ''
      }>${stampSvg(mark, uid)}</div>`
    : '';

  const wordmark = await loadWordmark();

  const el = document.createElement('div');
  el.className = `ddhq ddhq--${kind} ddhq--${locale} ddhq--${format}`;
  el.innerHTML = `${grainLayer()}<div class="ddhq__card">
    ${head}
    <div class="ddhq__titlewrap">${titleInner}${kind === 'multi' ? stamp : ''}</div>
    ${body}${tags}
    <div class="ddhq__base">${kind === 'multi' ? '' : stamp}${tip}</div>
    <div class="ddhq__ft">
      <div class="ddhq__fl">${esc(data.footer)}</div>
      <div class="ddhq__fr">${wordmark}</div>
    </div></div>`;
  return el;
}

export default renderCard;
