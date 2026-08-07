/* DueDateHQ change card renderer.
   renderCard(data) -> Promise<HTMLElement>
   See samples.json for the payload shape. */

import { tilegram, tileAnchor } from './tiles.js'

const ICON_BASE = new URL('./icons/', import.meta.url).href
const iconCache = new Map()

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

let wordmarkCache
/* 页脚 DueDateHQ 标识 = 官方 wordmark SVG(内联,渲染前就在 DOM 里)。 */
async function loadWordmark() {
  if (wordmarkCache === undefined) {
    wordmarkCache = fetch(new URL('./brand-wordmark.svg', import.meta.url).href)
      .then((r) => (r.ok ? r.text() : 'DueDateHQ'))
      .catch(() => 'DueDateHQ')
  }
  return wordmarkCache
}

async function loadIcon(code) {
  if (!iconCache.has(code)) {
    iconCache.set(
      code,
      fetch(`${ICON_BASE}${code}.svg`).then((r) => {
        if (!r.ok) throw new Error(`no icon for ${code}`)
        return r.text()
      }),
    )
  }
  return iconCache.get(code)
}

/* Paints the affected counties. Pass [] for a plain state silhouette.
   缺图的辖区(如领地 MP)优雅降级:不画地图,不报错。 */
async function stateIcon(code, counties = []) {
  let svg
  try {
    svg = await loadIcon(code)
  } catch {
    return ''
  }
  svg = svg.replace(/var\(--icon-off,#D6D4CB\)/g, 'var(--map-off)')
  for (const fips of counties) {
    svg = svg.replace(`<path id="c${fips}"`, `<path fill="var(--map-on)" id="c${fips}"`)
  }
  return svg
}

/* Paper grain. Rendered once, referenced by every card. */
function grainDefs() {
  if (document.getElementById('ddhq-grain-def')) return
  const d = document.createElement('div')
  d.id = 'ddhq-grain-def'
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs>
    <filter id="ddhqGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.82"
        numOctaves="4" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
    </filter></defs></svg>`
  document.body.appendChild(d)
}

const grainLayer = () =>
  `<svg class="ddhq__grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
     <rect width="100%" height="100%" filter="url(#ddhqGrain)"/></svg>`

/* Highlighter band. Edges wobble so it reads as a marker stroke, not a rect. */
function highlighter(fill = 'var(--lime)') {
  return `<span class="ddhq__hl" aria-hidden="true">
    <svg viewBox="0 0 100 40" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <path fill="${fill}" d="M0.8 4.6C14 3 30 5.2 48 3.8C66 2.4 84 4.6 99.2 3.2
        L99.2 36.2C86 37.8 68 35.6 50 37C32 38.4 14 36.6 0.8 37.6Z"/>
    </svg></span>`
}

function stampSvg({ date, time, label = 'DETECTED', ink = 'var(--stamp-ink)', size = 188 }, uid) {
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
      text-anchor="middle" letter-spacing="1">${esc(time)}</text></svg>`
}

let uidSeq = 0

export async function renderCard(data) {
  grainDefs()
  const uid = ++uidSeq
  const kind = data.kind || 'delay'
  const locale = data.locale || 'zh'
  const format = data.format || 'xhs'
  const isCorrection = kind === 'correction'

  const src = data.source || {} // cover 页没有 source
  const icon = data.map ? await stateIcon(data.map.state, data.map.counties || []) : ''

  const head = `<div class="ddhq__top">
    ${icon ? `<div class="ddhq__icon">${icon}</div>` : ''}
    <div>
      <div class="ddhq__srcline">
        <span class="ddhq__lvl">${esc(src.level)}</span>
        <span class="ddhq__org">${esc(src.org)}</span>
      </div>
      <div class="ddhq__why">${esc(data.reason)}</div>
    </div>
    <div class="ddhq__nid"><span class="mono">${esc(src.noticeId)}</span>${
      src.verified ? '<span style="color:var(--g2)"> ✓</span>' : ''
    }</div>
  </div>`

  const titleInner = `<div class="ddhq__h">${(Array.isArray(data.title) ? data.title : [data.title])
    .map(esc)
    .join('<br>')}</div>`

  let body = ''
  if (kind === 'agenda') {
    /* 日程式:以截止日为主轴分组,州名做次级。最近一组可带 note(倒计时)高亮。 */
    const groups = (data.groups || [])
      .map((g) => {
        const states = g.states
          .map(
            (s) =>
              `<span class="ddhq__agst"><span class="ddhq__agsn">${esc(s.name)}</span>${s.scope ? ` <span class="ddhq__agss">${esc(s.scope)}</span>` : ''}</span>`,
          )
          .join('')
        return `<div class="ddhq__ag">
        <div class="ddhq__agh"><span class="ddhq__agd">${esc(g.date)}</span>${g.note ? `<span class="ddhq__agn">${esc(g.note)}</span>` : ''}</div>
        <div class="ddhq__ags">${states}</div>
      </div>`
      })
      .join('')
    body = `<div class="ddhq__agenda">${groups}</div>`
  } else if (kind === 'note') {
    /* 第 2 页:实务提示单独成页。编号要点,字号放大到整页可读。 */
    const pts = (data.points || [])
      .map(
        (p, i) =>
          `<div class="ddhq__np"><span class="ddhq__nn">${i + 1}</span>
         <span class="ddhq__nx">${esc(p)}</span></div>`,
      )
      .join('')
    body = `<div class="ddhq__notes">${pts}</div>`
  } else if (kind === 'multi') {
    const all = data.rows || []
    /* 版面容量：4 行常规，6 行紧凑，12 行双栏，超出则截断并注明。 */
    const CAP = 12
    const shown = all.slice(0, CAP)
    const density =
      all.length <= 4 ? '' : all.length <= 6 ? ' ddhq__rows--compact' : ' ddhq__rows--two'
    const rows = await Promise.all(
      shown.map(async (r) => {
        const ic = await stateIcon(r.state, [])
        return `<div class="ddhq__r">
        <div class="ddhq__rs">${ic}<span>${esc(r.name)}</span>
          <span class="ddhq__rq">${esc(r.scope)}</span></div>
        <div class="ddhq__rd serif">${esc(r.date)}</div></div>`
      }),
    )
    const more =
      all.length > CAP
        ? `<div class="ddhq__more">${
            locale === 'en'
              ? `${all.length - CAP} more jurisdictions — see profile`
              : `另有 ${all.length - CAP} 个辖区，见主页合集`
          }</div>`
        : ''
    body = `<div class="ddhq__rows${density}">${rows.join('')}${more}</div>`
  } else {
    const newSlot =
      kind === 'pending'
        ? `<span class="ddhq__pend serif">${esc(data.newDate || (locale === 'en' ? 'date not yet announced' : '日期待公布'))}</span>`
        : `<span class="ddhq__new">${highlighter(
            isCorrection ? 'var(--red-pale)' : 'var(--lime)',
          )}<span class="ddhq__newtx serif">${esc(data.newDate)}</span></span>`

    const oldSlot =
      kind === 'pending'
        ? `<span class="ddhq__old serif" style="text-decoration:none;color:var(--ink)">${esc(
            data.oldDate,
          )}</span>`
        : `<span class="ddhq__old serif">${esc(data.oldDate)}</span>`

    body = `<div class="ddhq__lab">${esc(data.dateLabel)}</div>
      <div class="ddhq__dates">${oldSlot}
        <span class="ddhq__arw">&#8594;</span>${newSlot}</div>`
  }

  const noBody = kind === 'note' || kind === 'agenda'
  const tags =
    !noBody && (data.forms || []).length
      ? `<div class="ddhq__tags">${data.forms
          .map((f) => `<span class="ddhq__tag${/^[\d-]/.test(f) ? ' mono' : ''}">${esc(f)}</span>`)
          .join('')}</div>`
      : ''

  const tip =
    !noBody && data.tip
      ? `<div class="ddhq__tip"><div class="ddhq__tl">${esc(data.tip.label)}</div>
       <div class="ddhq__tb">${esc(data.tip.body)}</div></div>`
      : ''

  /* 补录的历史公告不能盖 DETECTED —— 那枚章宣称的是"我们第一时间发现了"。
     没有 detected 时改盖中性灰的 ON FILE，显示官方发布日，不显示时间。 */
  const mark =
    data.detected && data.detected.date
      ? {
          date: data.detected.date,
          time: data.detected.time,
          label: 'DETECTED',
          ink: isCorrection ? 'var(--red)' : 'var(--stamp-ink)',
          size: data.detected.size || 188,
        }
      : data.publishedAt
        ? { date: data.publishedAt, time: '', label: 'ON FILE', ink: 'var(--g1)', size: 188 }
        : null

  const stamp = mark
    ? `<div class="ddhq__stamp"${
        data.detected?.position ? ` style="${data.detected.position}"` : ''
      }>${stampSvg(mark, uid)}</div>`
    : ''

  const wordmark = await loadWordmark()

  const el = document.createElement('div')
  el.className = `ddhq ddhq--${kind} ddhq--${locale} ddhq--${format}`
  const footer = `<div class="ddhq__ft">
      <div class="ddhq__fl">${esc(data.footer)}</div>
      <div class="ddhq__fr">${wordmark}<span class="ddhq__tagline">for CPA firms</span></div>
    </div>`

  /* ── hero:实景/深色英雄图 + 悬浮信息卡(方向 A)──
     差异化来自每条自己的图。没有图时退回州形深色底,版式不塌。 */
  if (kind === 'hero') {
    const st = (data.map && data.map.state) || ''
    const glyph = st ? await stateIcon(st, (data.map && data.map.counties) || []) : ''
    const heroStyle = data.photo ? `background-image:url('${esc(data.photo)}')` : ''
    const cd = data.countdown || {}
    el.innerHTML = `${grainLayer()}
      <div class="ddhq__hero${data.photo ? '' : ' ddhq__hero--flat'}" style="${heroStyle}">
        ${data.photo ? '' : `<div class="ddhq__heroglyph">${glyph}</div>`}
        <div class="ddhq__heroveil"></div>
        <div class="ddhq__herotag">${esc(data.heroTag || (data.source && data.source.org) || '')}</div>
      </div>
      <div class="ddhq__float">
        <div class="ddhq__kicker">${esc(data.eyebrow)}</div>
        <div class="ddhq__stateline">
          ${glyph ? `<span class="ddhq__stateglyph">${glyph}</span>` : ''}
          <span class="ddhq__statename">${esc(data.stateName)}</span>
        </div>
        <div class="ddhq__due">
          <span class="ddhq__duedate serif">${esc(data.newDate)}</span><span class="ddhq__duesuffix">${esc(
            data.dueSuffix ?? (locale === 'en' ? 'deadline' : '截止'),
          )}</span>
          ${
            cd.days != null
              ? `<span class="ddhq__duemeta ddhq__duemeta--${cd.tone || 'far'}">${esc(
                  cd.label ?? (locale === 'en' ? 'in' : '还剩'),
                )} <b>${esc(cd.days)}</b> ${esc(cd.unit ?? (locale === 'en' ? 'days' : '天'))}</span>`
              : ''
          }
        </div>
        ${data.sub ? `<div class="ddhq__blurb">${esc(data.sub)}</div>` : ''}
        ${
          (data.forms || []).length
            ? `<div class="ddhq__tags">${data.forms
                .map(
                  (f) =>
                    `<span class="ddhq__tag${/^[\d-]/.test(f) ? ' mono' : ''}">${esc(f)}</span>`,
                )
                .join('')}</div>`
            : ''
        }
        ${footer}
      </div>`
    return el
  }

  /* ── facts:轮播第 2 页。封面只答「谁/何时」,这页答「覆盖什么/怎么适用」。
     定义列表版式:标签小、值大,一行一件事,和封面共用同一套字阶与留白。 ── */
  if (kind === 'facts') {
    const rows = (data.rows || [])
      .map(
        (r) => `<div class="ddhq__fact">
          <div class="ddhq__factlab">${esc(r.label)}</div>
          <div class="ddhq__factval">${esc(r.value)}</div>
          ${r.note ? `<div class="ddhq__factnote">${esc(r.note)}</div>` : ''}
        </div>`,
      )
      .join('')
    el.innerHTML = `${grainLayer()}<div class="ddhq__card">
      <div class="ddhq__contbar">
        <span class="ddhq__contstate">${esc(data.stateName || '')}</span>
        <span class="ddhq__contdate">${esc(data.newDate || '')} ${esc(
          data.dueSuffix ?? (locale === 'en' ? 'deadline' : '截止'),
        )}</span>
      </div>
      <div class="ddhq__factstitle">${(Array.isArray(data.title) ? data.title : [data.title])
        .map(esc)
        .join('<br>')}</div>
      <div class="ddhq__facts">${rows}</div>
      ${
        data.callout
          ? `<div class="ddhq__callout">
              <div class="ddhq__calloutlab">${esc(data.callout.label)}</div>
              <div class="ddhq__calloutbody">${esc(data.callout.body)}</div>
            </div>`
          : ''
      }
      ${footer}</div>`
    return el
  }

  /* ── mapcover:全美方块地图作主视觉(方向 B)──
     高亮块 = 本条讲的辖区;缩略图尺寸下「是不是我的州」一眼可判。 */
  if (kind === 'mapcover') {
    const st = (data.map && data.map.state) || ''
    /* 清单类卡片可以同时点亮多个辖区:map.states 传数组。 */
    const active = (data.map && data.map.states) || (st ? [st] : [])
    const anchor = tileAnchor(st)
    const cd = data.countdown || {}
    el.innerHTML = `${grainLayer()}<div class="ddhq__card">
      <div class="ddhq__mchead">
        <div class="ddhq__fr ddhq__mcmark">${wordmark}</div>
        <div class="ddhq__mctitle">${(Array.isArray(data.title) ? data.title : [data.title])
          .map(esc)
          .join('<br>')}</div>
      </div>
      <div class="ddhq__mapwrap">
        ${tilegram({ active, label: active.length <= 3 })}
        ${
          anchor && data.badge
            ? `<span class="ddhq__badge" style="left:${anchor.xPct}%;top:${anchor.yPct}%">${esc(
                data.badge,
              )}</span>`
            : ''
        }
      </div>
      <div class="ddhq__mcfoot">
        <div class="ddhq__stateline">
          <span class="ddhq__statename">${esc(data.stateName)}</span>
        </div>
        <div class="ddhq__due">
          <span class="ddhq__duedate serif">${esc(data.newDate)}</span><span class="ddhq__duesuffix">${esc(
            data.dueSuffix ?? (locale === 'en' ? 'deadline' : '截止'),
          )}</span>
          ${
            cd.days != null
              ? `<span class="ddhq__duemeta ddhq__duemeta--${cd.tone || 'far'}">${esc(
                  cd.label ?? (locale === 'en' ? 'in' : '还剩'),
                )} <b>${esc(cd.days)}</b> ${esc(cd.unit ?? (locale === 'en' ? 'days' : '天'))}</span>`
              : ''
          }
        </div>
        ${data.sub ? `<div class="ddhq__blurb">${esc(data.sub)}</div>` : ''}
        ${
          (data.forms || []).length
            ? `<div class="ddhq__tags">${data.forms
                .map(
                  (f) =>
                    `<span class="ddhq__tag${/^[\d-]/.test(f) ? ' mono' : ''}">${esc(f)}</span>`,
                )
                .join('')}</div>`
            : ''
        }
        ${footer}
      </div>
    </div>`
    return el
  }

  if (kind === 'cover') {
    /* 小红书封面:大字钩子优先(瀑布流里靠这张拿到点击)。可选 eyebrow + sub。
       hook 里用 [[…]] 包住的片段会套 lime 高亮。 */
    const raw = Array.isArray(data.title) ? data.title : [data.title]
    const hook = raw
      .map((line) =>
        esc(line).replace(
          /\[\[(.+?)\]\]/g,
          (_, m) =>
            `<span class="ddhq__cvhl">${highlighter('var(--lime)')}<span class="ddhq__cvhlt">${m}</span></span>`,
        ),
      )
      .join('<br>')
    const mark =
      data.map && data.map.state
        ? `<div class="ddhq__cvmark" aria-hidden="true">${await stateIcon(data.map.state, [])}</div>`
        : ''
    el.innerHTML = `${grainLayer()}<div class="ddhq__card">
      ${mark}
      ${data.eyebrow ? `<div class="ddhq__cveb">${esc(data.eyebrow)}</div>` : ''}
      <div class="ddhq__cvmid">
        <div class="ddhq__cvhook">${hook}</div>
        ${data.sub ? `<div class="ddhq__cvsub">${esc(data.sub)}</div>` : ''}
      </div>
      <div class="ddhq__cvledger" aria-hidden="true"></div>
      ${footer}</div>`
    return el
  }

  el.innerHTML = `${grainLayer()}<div class="ddhq__card">
    ${head}
    <div class="ddhq__lead">
      <div class="ddhq__titlewrap">${titleInner}${kind === 'multi' ? stamp : ''}</div>
      ${body}${tags}
    </div>
    <div class="ddhq__base">${kind === 'multi' ? '' : stamp}${tip}</div>
    ${footer}</div>`
  return el
}

export default renderCard
