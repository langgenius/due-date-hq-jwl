const { chromium } = require('@playwright/test')
const OUT = '/Users/yuqi/Desktop'
const NAVY = '#1F315C', INK = '#1A2433', MUT = '#667085', ACC = '#22488C', BG = '#F9FAFB'
const GREEN = '#3FA86A', GREEN_INK = '#1E7A47', AMBER = '#C0883A', AMBER_INK = '#7A5320', RED = '#D2553F', RED_INK = '#B23A28', INFO = '#3AB3E0', INFO_INK = '#0E6E92', GRAY = '#98A2B3', CYAN = '#14C5F6'
const WACC = '#EAEFF7', WGRN = '#E8F5EC', WAMB = '#F4ECDE', WRED = '#FBE9E4'
const BRD = 'rgba(16,24,40,.11)', HAIR = 'rgba(16,24,40,.07)'
const fs = require('fs')
const av64 = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(`/tmp/ph-avatars/${f}`).toString('base64')
const AV = { rp: av64('men_32.jpg'), pp: av64('women_65.jpg'), jm: av64('women_90.jpg'), ls: av64('men_52.jpg'), ph: av64('men_75.jpg'), mc: av64('women_68.jpg') }
const pic = (key, size, ring) => `<span style="width:${size}px;height:${size}px;border-radius:50%;background:#e9edf2 url('${AV[key]}') center/cover;flex-shrink:0;display:inline-block${ring ? `;box-shadow:0 0 0 ${ring}px #fff` : ''}"></span>`
// Faithful StatusRing (status-ring.tsx): 16×16, r=6, fills along the happy path; tinted via currentColor
const RING_SHAPE = {
  not_started: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2.2"/>`,
  waiting: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="5.2" width="1.3" height="5.6" rx="0.55" fill="currentColor"/><rect x="8.7" y="5.2" width="1.3" height="5.6" rx="0.55" fill="currentColor"/>`,
  blocked: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  in_review: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" opacity="0.25"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="18.85 37.7" transform="rotate(-90 8 8)"/>`,
  filed: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" opacity="0.25"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="32 37.7" transform="rotate(-90 8 8)"/>`,
  completed: `<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 8.2 L7 10.2 L11 6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
}
const ring = (level, size) => `<svg width="${size || 15}" height="${size || 15}" viewBox="0 0 16 16" fill="none" style="display:block;flex-shrink:0">${RING_SHAPE[level]}</svg>`
function markSvg(h){return `<svg viewBox="0 0 256 256" style="height:${h}px;width:${h}px"><rect width="256" height="256" rx="54" fill="${NAVY}"/><g transform="translate(32 54.6) scale(2.259)" fill="#F3EEE6"><rect width="74" height="12" rx="3.5"/><rect y="17" width="74" height="12" rx="3.5"/><rect x="10.4111" y="35.6758" width="73.8388" height="12" rx="3.5" transform="rotate(-2.43169 10.4111 35.6758)"/><rect y="51" width="74" height="12" rx="3.5"/></g></svg>`}
const WP=['M103.768 69.888V1.152H126.904C137.4 1.152 145.816 4.288 152.152 10.56C158.52 16.8 161.704 25.104 161.704 35.472C161.704 45.808 158.504 54.128 152.104 60.432C145.736 66.736 137.336 69.888 126.904 69.888H103.768ZM114.28 60.384H126.616C134.072 60.384 139.976 58.176 144.328 53.76C148.712 49.344 150.904 43.312 150.904 35.664V35.616C150.904 27.936 148.744 21.872 144.424 17.424C140.104 12.976 134.168 10.752 126.616 10.752H114.28V60.384Z','M183.975 71.04C178.343 71.04 173.959 69.376 170.823 66.048C167.687 62.688 166.119 58.096 166.119 52.272V19.92H176.103V49.92C176.103 53.92 177.015 56.976 178.839 59.088C180.663 61.2 183.351 62.256 186.903 62.256C190.679 62.256 193.751 60.912 196.119 58.224C198.519 55.504 199.719 52.128 199.719 48.096V19.92H209.751V69.888H200.055V57.696L204.855 62.496H199.959C198.423 65.12 196.263 67.2 193.479 68.736C190.727 70.272 187.559 71.04 183.975 71.04Z','M240.082 71.04C232.722 71.04 226.562 68.576 221.602 63.648C216.674 58.72 214.21 52.464 214.21 44.88C214.21 37.328 216.658 31.088 221.554 26.16C226.482 21.232 232.53 18.768 239.698 18.768C246.994 18.768 252.882 21.024 257.362 25.536C261.874 30.016 264.13 35.68 264.13 42.528V47.184H219.442V40.272H254.386C254.194 36.56 252.77 33.488 250.114 31.056C247.458 28.592 244.002 27.36 239.746 27.36C235.266 27.36 231.49 28.992 228.418 32.256C225.346 35.52 223.81 39.744 223.81 44.928C223.81 50.208 225.442 54.48 228.706 57.744C232.002 60.976 235.922 62.592 240.466 62.592C242.738 62.592 244.722 62.272 246.418 61.632C248.146 60.992 249.698 60.08 251.074 58.896C252.45 57.68 253.906 55.872 255.442 53.472L263.026 57.408C261.17 60.864 259.17 63.536 257.026 65.424C254.882 67.28 252.45 68.688 249.73 69.648C247.042 70.576 243.826 71.04 240.082 71.04Z','M269.248 69.888V1.152H292.384C302.88 1.152 311.296 4.288 317.632 10.56C324 16.8 327.184 25.104 327.184 35.472C327.184 45.808 323.984 54.128 317.584 60.432C311.216 66.736 302.816 69.888 292.384 69.888H269.248ZM279.76 60.384H292.096C299.552 60.384 305.456 58.176 309.808 53.76C314.192 49.344 316.384 43.312 316.384 35.664V35.616C316.384 27.936 314.224 21.872 309.904 17.424C305.584 12.976 299.648 10.752 292.096 10.752H279.76V60.384Z','M348.063 71.04C342.591 71.04 338.095 69.568 334.575 66.624C331.087 63.648 329.343 59.744 329.343 54.912C329.343 49.888 331.279 45.888 335.151 42.912C339.055 39.904 344.127 38.4 350.367 38.4C352.863 38.4 355.375 38.672 357.903 39.216C360.431 39.728 362.591 40.448 364.383 41.376V38.352C364.383 34.832 363.167 32.08 360.735 30.096C358.303 28.112 355.327 27.12 351.807 27.12C349.887 27.12 348.191 27.36 346.719 27.84C345.279 28.288 343.983 28.912 342.831 29.712C341.679 30.512 340.559 31.456 339.471 32.544C338.383 33.6 337.839 34.128 337.839 34.128L331.071 28.608C331.071 28.608 331.791 27.888 333.231 26.448C334.703 24.976 336.367 23.648 338.223 22.464C340.079 21.28 342.159 20.368 344.463 19.728C346.799 19.088 349.583 18.768 352.815 18.768C359.279 18.768 364.463 20.496 368.367 23.952C372.271 27.376 374.223 32.064 374.223 38.016V69.888H364.575V59.184L367.119 62.304H364.479C362.783 65.088 360.495 67.248 357.615 68.784C354.735 70.288 351.551 71.04 348.063 71.04ZM349.983 62.976C354.271 62.976 357.743 61.472 360.399 58.464C363.055 55.424 364.383 52.224 364.383 48.864V48.48C362.911 47.52 361.055 46.752 358.815 46.176C356.607 45.6 354.255 45.312 351.759 45.312C347.919 45.312 344.879 46.096 342.639 47.664C340.399 49.2 339.279 51.456 339.279 54.432C339.279 57.088 340.255 59.184 342.207 60.72C344.191 62.224 346.783 62.976 349.983 62.976Z','M395.714 71.04C391.714 71.04 388.45 69.904 385.922 67.632C383.426 65.328 382.178 61.696 382.178 56.736V7.104H392.162V55.536C392.162 58.064 392.658 59.856 393.65 60.912C394.642 61.968 396.066 62.496 397.922 62.496C398.658 62.496 399.362 62.448 400.034 62.352C400.738 62.224 401.57 62.016 402.53 61.728C403.49 61.44 403.97 61.296 403.97 61.296V69.552C403.97 69.552 403.442 69.712 402.386 70.032C401.362 70.352 400.29 70.592 399.17 70.752C398.082 70.944 396.93 71.04 395.714 71.04ZM374.21 28.32V19.92H404.066V28.32H374.21Z','M430.972 71.04C423.612 71.04 417.452 68.576 412.492 63.648C407.564 58.72 405.1 52.464 405.1 44.88C405.1 37.328 407.548 31.088 412.444 26.16C417.372 21.232 423.42 18.768 430.588 18.768C437.884 18.768 443.772 21.024 448.252 25.536C452.764 30.016 455.02 35.68 455.02 42.528V47.184H410.332V40.272H445.276C445.084 36.56 443.66 33.488 441.004 31.056C438.348 28.592 434.892 27.36 430.636 27.36C426.156 27.36 422.38 28.992 419.308 32.256C416.236 35.52 414.7 39.744 414.7 44.928C414.7 50.208 416.332 54.48 419.596 57.744C422.892 60.976 426.812 62.592 431.356 62.592C433.628 62.592 435.612 62.272 437.308 61.632C439.036 60.992 440.588 60.08 441.964 58.896C443.34 57.68 444.796 55.872 446.332 53.472L453.916 57.408C452.06 60.864 450.06 63.536 447.916 65.424C445.772 67.28 443.34 68.688 440.62 69.648C437.932 70.576 434.716 71.04 430.972 71.04Z','M504.586 69.888V1.152H515.098V69.888H504.586ZM460.138 69.888V1.152H470.65V69.888H460.138ZM465.658 39.84V30.048H509.722V39.84H465.658Z','M556.557 71.04C546.477 71.04 538.093 67.664 531.405 60.912C524.749 54.16 521.421 45.696 521.421 35.52C521.421 25.344 524.749 16.88 531.405 10.128C538.093 3.376 546.477 0 556.557 0C566.573 0 574.941 3.392 581.661 10.176C588.413 16.928 591.789 25.376 591.789 35.52C591.789 45.568 588.429 54 581.709 60.816C574.989 67.632 566.605 71.04 556.557 71.04ZM556.557 61.056C563.693 61.056 569.565 58.64 574.173 53.808C578.813 48.944 581.133 42.848 581.133 35.52C581.133 28.128 578.813 22.032 574.173 17.232C569.533 12.4 563.661 9.984 556.557 9.984C549.421 9.984 543.549 12.4 538.941 17.232C534.333 22.064 532.029 28.16 532.029 35.52C532.029 42.88 534.317 48.976 538.893 53.808C543.501 58.64 549.389 61.056 556.557 61.056ZM579.453 76.512L560.925 49.824L568.989 44.592L587.613 71.232L579.453 76.512Z']
function wmk(h){return `<svg viewBox="103.768 0 488.021 76.512" style="height:${h}px"><g fill="${NAVY}">${WP.map((d)=>`<path d="${d}"/>`).join('')}</g></svg>`}
const LOCK = `<div style="position:absolute;top:74px;left:96px;display:flex;align-items:center;gap:10px">${markSvg(22)}${wmk(17)}</div>`
function markSvgLight(h){return `<svg viewBox="0 0 256 256" style="height:${h}px;width:${h}px"><rect width="256" height="256" rx="54" fill="#F3EEE6"/><g transform="translate(32 54.6) scale(2.259)" fill="${NAVY}"><rect width="74" height="12" rx="3.5"/><rect y="17" width="74" height="12" rx="3.5"/><rect x="10.4111" y="35.6758" width="73.8388" height="12" rx="3.5" transform="rotate(-2.43169 10.4111 35.6758)"/><rect y="51" width="74" height="12" rx="3.5"/></g></svg>`}
function wmkLight(h){return `<svg viewBox="103.768 0 488.021 76.512" style="height:${h}px"><g fill="#F3EEE6">${WP.map((d)=>`<path d="${d}"/>`).join('')}</g></svg>`}
const LOCK_LIGHT = `<div style="position:absolute;top:74px;left:96px;display:flex;align-items:center;gap:10px">${markSvgLight(22)}${wmkLight(17)}</div>`
const TILES={WA:[1,0],ME:[11,0],OR:[1,1],ID:[2,1],MT:[3,1],ND:[4,1],MN:[5,1],IL:[6,1],MI:[7,1],VT:[10,1],NH:[11,1],NV:[2,2],WY:[3,2],SD:[4,2],IA:[5,2],IN:[6,2],OH:[7,2],PA:[8,2],NJ:[9,2],MA:[10,2],RI:[11,2],NY:[8,1.5],CA:[1,3],UT:[2,3],CO:[3,3],NE:[4,3],MO:[5,3],KY:[6,3],WV:[7,3],VA:[8,3],MD:[9,3],DE:[10,3],CT:[11,3],AZ:[2,4],NM:[3,4],KS:[4,4],AR:[5,4],TN:[6,4],NC:[7,4],SC:[8,4],DC:[10,4],OK:[4,5],LA:[5,5],MS:[6,5],AL:[7,5],GA:[8,5],TX:[4,6],FL:[9,6],AK:[0,7],HI:[1,7]}
const HOT = ['WA','NY','TX','CA','FL','IL','GA','OH']
function cleanMap(C, S) {
  return Object.entries(TILES).map(([code, [col, row]]) => {
    const on = HOT.includes(code)
    const dot = on ? `<span style="position:absolute;top:-3px;right:-3px;width:${Math.round(S * 0.34)}px;height:${Math.round(S * 0.34)}px;border-radius:50%;background:${CYAN};box-shadow:0 0 0 2px ${BG},0 0 9px ${CYAN}"></span>` : ''
    return `<div style="position:absolute;left:${col * C}px;top:${row * C}px;width:${S}px;height:${S}px;border-radius:${Math.round(S * 0.28)}px;background:${on ? 'rgba(34,72,140,.92)' : 'rgba(16,24,40,.07)'}">${dot}</div>`
  }).join('')
}
function slimFooter(dark) {
  const txt = dark ? 'rgba(243,238,230,.72)' : INK
  const mut = dark ? 'rgba(243,238,230,.5)' : MUT
  const line = dark ? 'rgba(255,255,255,.12)' : HAIR
  const dotc = dark ? 'rgba(243,238,230,.34)' : 'rgba(16,24,40,.26)'
  const acc = dark ? CYAN : ACC
  const feat = (t) => `<span style="font-size:12.5px;font-weight:500;color:${txt};white-space:nowrap">${t}</span>`
  const dt = `<span style="width:3px;height:3px;border-radius:50%;background:${dotc};flex-shrink:0"></span>`
  return `<div style="position:absolute;left:0;right:0;bottom:0;height:60px;display:flex;align-items:center;gap:14px;padding:0 48px;border-top:1px solid ${line}">${dark ? markSvgLight(20) : markSvg(20)}<div style="display:flex;align-items:center;gap:10px">${feat('50 states + DC')}${dt}${feat('Matched to clients')}${dt}${feat('Sourced to the agency')}${dt}${feat('Audit-logged')}</div><div style="margin-left:auto;display:flex;align-items:center;gap:14px;flex-shrink:0"><span style="display:inline-flex;align-items:center;gap:6px;border:1px solid ${acc};border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;color:${acc};white-space:nowrap"><span style="width:6px;height:6px;border-radius:50%;background:${INFO}"></span>Early access open</span><span style="font-family:'Geist Mono';font-size:12px;color:${mut}">duedatehq.com</span></div></div>`
}
function page(inner, dark) {
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}
  body{width:1270px;height:820px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif;color:${MUT};background:${dark ? NAVY : BG};
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1.1' fill='${dark ? '%23F3EEE6' : '%231F315C'}' fill-opacity='${dark ? '0.06' : '0.055'}'/%3E%3C/svg%3E")}
  .stage{position:relative;width:1270px;height:820px}
  .h{font-family:'Instrument Sans',sans-serif;font-weight:600;color:${INK};line-height:1.05;letter-spacing:-.022em}
  .h em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;color:${ACC};letter-spacing:0}
  .s{font-size:19px;line-height:1.55;color:${MUT};font-weight:400}
  .ey{display:inline-flex;align-items:center;gap:11px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${ACC}}
  .ey::before{content:'';width:22px;height:2px;background:${ACC};border-radius:2px}
  .tick{display:flex;gap:5px;margin-bottom:26px}
  .tick i{width:13px;height:13px;border-radius:3px;background:rgba(31,49,92,.14)}
  .tick i.on{background:${ACC}}
  .cap{font-size:13px;font-weight:500;letter-spacing:.01em;color:${MUT}}
  .num{font-variant-numeric:tabular-nums}
  /* flat product UI — border-framed, near-flat, matches the live workbench */
  .fcard{background:#F2F4F7;border-radius:10px}
  .chip{font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:500;color:${INK};background:#fff;border:1px solid ${BRD};border-radius:6px;padding:3px 8px}
  .udot{width:8px;height:8px;border-radius:50%}
  .btn{border-radius:8px;padding:10px 15px;font-size:14px;font-weight:600;text-align:center}
  .btn.pri{background:${ACC};color:#fff;flex:1}
  .btn.sec{background:#fff;border:1px solid ${BRD};color:${INK};font-weight:500}
  .frow{display:flex;align-items:center;gap:11px;background:#F2F4F7;border-radius:10px;padding:12px 15px}
  .frow .t{margin-left:auto;font-size:12px;font-weight:500;color:${MUT}}
  .card{background:#fff;border-radius:12px;border:1px solid ${BRD};box-shadow:0 2px 4px rgba(16,24,40,.04),0 12px 24px -10px rgba(16,24,40,.10),0 30px 54px -22px rgba(16,24,40,.16)}
  .seal{width:36px;height:36px;border-radius:8px;background:${NAVY};display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .spill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;border-radius:999px;padding:5px 11px}
  .av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0}
  .qblk{background:#F2F4F7;border-radius:8px;padding:14px 16px}
  .lab{font-size:11px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;color:${MUT}}
  .bar{height:6px;border-radius:3px;background:rgba(16,24,40,.09);overflow:hidden}
  .bar i{display:block;height:100%;border-radius:3px;background:${ACC}}
  .divh{height:1px;background:${HAIR};margin:18px 0}
  .float{border:1px solid ${BRD};box-shadow:0 4px 10px -2px rgba(16,24,40,.10),0 18px 34px -12px rgba(16,24,40,.20)}
  .pipe{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:500;color:${MUT}}
  .pipe .seg{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  .anc{display:flex;gap:20px;font-size:13px;font-weight:500;color:${MUT};border-bottom:1px solid ${HAIR}}
  .anc .on{color:${INK};font-weight:500;padding-bottom:9px;box-shadow:inset 0 -2px 0 ${ACC}}
  .anc span:not(.on){padding-bottom:9px}
  </style></head><body><div class="stage">${dark ? LOCK_LIGHT : LOCK}${inner}${slimFooter(dark)}</div></body></html>`
}
function ic(d, s, c, sw) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>` }
const I = {
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  landmark: '<path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M3 10l9-6 9 6"/>',
  filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>',
  refresh: '<path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  news: '<path d="M16 22H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="M22 4v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/><path d="M14 7h4M14 11h4M10 7h.01M10 11h.01M10 15h8"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  sparkles: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M5 21h14"/>',
  penline: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 20 3"/><path d="m17 4 2 2"/><path d="m14.5 6.5 2 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 1.9"/>',
}
function cover() {
  const dim = (sealIc, agency, type, typeIc, title, n, top) => `<div style="position:absolute;left:0;right:0;top:${top}px;display:flex;align-items:center;gap:12px;padding:13px 20px;opacity:.5;border-top:1px solid ${HAIR}"><div style="width:30px;height:30px;border-radius:8px;background:#F2F4F7;display:flex;align-items:center;justify-content:center">${ic(sealIc, 15, NAVY)}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12.5px;font-weight:500;color:${INK}">${agency}</span><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${MUT}">${ic(typeIc, 11, MUT)}${type}</span></div><div style="font-size:13px;color:${MUT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${title}</div></div><span style="font-size:11.5px;font-weight:500;color:${MUT};flex-shrink:0">${n}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:580px">
      <div class="ey" style="margin-bottom:26px">For CPA firms · 50 states + DC</div>
      <div class="h" style="font-size:60px">Never miss a<br><em>tax deadline</em>.</div>
      <div class="s" style="margin-top:28px;max-width:430px">One change, matched to every client it affects.</div>
    </div>
    <div style="position:absolute;left:742px;top:250px;width:400px;height:270px;border-radius:50%;background:rgba(34,72,140,.12);filter:blur(80px)"></div>
    <div style="position:absolute;left:724px;top:156px;width:448px;height:236px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:702px;top:140px;width:470px;height:252px;padding:6px 0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:9px;padding:16px 20px 12px;border-bottom:1px solid ${HAIR}">${ic(I.bell, 17, INK)}<span style="font-size:15px;font-weight:600;color:${INK}">Alerts</span><span style="font-size:12px;font-weight:500;color:${MUT};background:#F2F4F7;border-radius:999px;padding:2px 9px">6</span><span style="display:inline-flex;align-items:center;gap:5px;margin-left:auto;font-size:12px;font-weight:500;color:${INFO_INK}"><span style="width:7px;height:7px;border-radius:50%;background:${INFO}"></span>Live</span></div>
      <div style="position:relative;background:${WACC};box-shadow:inset 3px 0 0 ${ACC};padding:16px 20px 18px">
        <div style="display:flex;align-items:center;gap:11px">
          <div class="seal" style="width:30px;height:30px;border-radius:8px">${ic(I.landmark, 16, '#fff')}</div>
          <div style="line-height:1.15"><div style="font-size:13.5px;font-weight:500;color:${INK}">IRS · Federal</div><div style="font-size:11.5px;color:${MUT};display:flex;align-items:center;gap:5px">${ic(I.filePlus, 11, MUT)}New requirement · 2h ago</div></div>
          <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;background:${WAMB};color:${AMBER_INK};font-size:11px;font-weight:500;padding:4px 10px;border-radius:999px"><span style="width:6px;height:6px;border-radius:50%;background:${AMBER}"></span>Needs decision</span>
        </div>
        <div style="font-size:16px;font-weight:500;color:${INK};line-height:1.4;margin-top:13px">Schedule K-3 now required for partnerships with foreign activity.</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:13px">
          <span style="font-size:12.5px;font-weight:500;color:${INK}">Affects 3 clients</span>
          <div style="display:flex">${['ls', 'ph', 'mc'].map((k, i) => `<span style="width:26px;height:26px;border-radius:50%;background:#e9edf2 url('${AV[k]}') center/cover;margin-left:${i ? -8 : 0}px;box-shadow:0 0 0 2px #fff;flex-shrink:0;display:inline-block"></span>`).join('')}</div>
        </div>
        <div style="display:flex;gap:9px;margin-top:16px">
          <div class="btn pri" style="display:inline-flex;align-items:center;gap:7px;flex:none;padding:10px 15px;font-size:13.5px">${ic(I.check, 14, '#fff', 2.6)}Apply to 3 clients</div>
          <div class="btn sec" style="display:inline-flex;align-items:center;gap:7px;padding:10px 15px;font-size:13.5px">${ic(I.send, 13, INK)}Copy email draft</div>
        </div>
      </div>
    </div>
    <div class="float" style="position:absolute;right:40px;top:288px;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:7px 13px;font-size:11.5px;font-weight:500;color:${GREEN_INK}">${ic(I.check, 12, GREEN_INK, 2.6)}AI matched</div>
    <div class="float" style="position:absolute;left:838px;top:418px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px"><span style="font-family:'Geist Mono';font-size:11px;font-weight:500;color:${ACC}">98%</span><span style="font-size:11px;color:${MUT}">· High parse confidence</span></div>`)
}
function monitoring() {
  const feed = (chip, text, n, time, last) => `<div style="display:flex;align-items:center;gap:12px;padding:13px 0;${last?'':`border-bottom:1px solid ${HAIR}`}"><span class="chip" style="flex-shrink:0">${chip}</span><span style="flex:1;min-width:0;font-size:13.5px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text}</span><span class="spill" style="background:${WACC};color:${ACC};flex-shrink:0">${n} clients</span><span class="num" style="font-size:12px;color:${MUT};width:42px;text-align:right;flex-shrink:0">${time}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:580px">
      <div class="ey" style="margin-bottom:28px">Always-on monitoring</div>
      <div class="h" style="font-size:58px">All 50 states,<br>plus <em>federal</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">The IRS, FEMA, and every state agency — watched 24/7.</div>
    </div>
    <div style="position:absolute;left:806px;top:96px;width:400px;height:350px;background:radial-gradient(circle,rgba(20,197,246,.22),transparent 68%)"></div>
    <div style="position:absolute;left:700px;top:100px;width:540px;height:360px">${cleanMap(44, 34)}</div>
    <div class="float" style="position:absolute;left:1026px;top:126px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:10px;padding:6px 12px"><span style="width:7px;height:7px;border-radius:50%;background:${CYAN};box-shadow:0 0 7px ${CYAN}"></span><span style="font-size:11.5px;font-weight:500;color:${INK}">NY · 5 new</span></div>
    <div style="position:absolute;left:1062px;top:158px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #fff"></div>
    <div style="position:absolute;left:722px;top:466px;width:476px;height:172px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:700px;top:452px;width:476px;padding:14px 22px 18px">
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:4px"><span style="width:8px;height:8px;border-radius:50%;background:${INFO}"></span><span style="font-size:13px;font-weight:600;color:${INK}">Live source watch</span><span style="margin-left:auto;font-size:12.5px;font-weight:500;color:${MUT}" class="num">8 changes today</span></div>
      ${feed('IRS', 'Schedule K-3 now required', 3, 'now', false)}
      ${feed('NY DTF', 'PTET window moved', 5, '14m', false)}
      ${feed('TX', 'Franchise window extended', 2, '1h', true)}
    </div>`)
}
function alert() {
  const seg = (label, state) => state === 'done'
    ? `<span class="seg" style="color:${INK}">${ic(I.check, 12, GREEN_INK, 2.8)}${label}</span>`
    : state === 'now'
      ? `<span class="seg" style="color:${INK};font-weight:500"><span style="width:7px;height:7px;border-radius:50%;background:${ACC}"></span>${label}</span>`
      : `<span class="seg" style="opacity:.55">${label}</span>`
  const pf = (label, val) => `<div><div class="lab">${label}</div><div style="font-size:14px;color:${INK};margin-top:4px">${val}</div></div>`
  return page(`
    <div style="position:absolute;left:96px;top:266px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">Reads every notice</div>
      <div class="h" style="font-size:56px">It flags<br><em>who's hit</em>.</div>
      <div class="s" style="margin-top:30px;max-width:380px">Every change, matched to the exact clients it touches.</div>
    </div>
    <div class="card" style="position:absolute;left:730px;top:160px;width:448px;padding:22px 24px">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="seal" style="width:32px;height:32px">${ic(I.landmark, 16, '#fff')}</div>
        <div style="line-height:1.2"><div style="font-size:14px;font-weight:500;color:${INK}">NY DTF · New York</div><div style="font-size:12px;color:${MUT};display:flex;align-items:center;gap:5px">${ic(I.refresh, 11, MUT)}Form updated</div></div>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC}">Open original ${ic(I.ext, 11, ACC)}</span>
      </div>
      <div style="font-size:16px;font-weight:600;color:${INK};line-height:1.4;margin-top:14px">NY DTF clarifies the PTET election window for partnerships.</div>
      <div class="pipe" style="margin-top:15px">${seg('Monitored', 'done')}${seg('AI parsed', 'done')}${seg('Matched', 'done')}${seg('Your decision', 'now')}${seg('Applied', 'next')}</div>
      <div class="anc" style="margin-top:16px"><span class="on">Change</span><span>Source</span><span>Activity</span></div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:16px"><span style="font-size:13px;font-weight:500;color:${INK}">Parsed fields</span><span style="font-size:11px;color:${MUT}">AI parsed — verify before Apply</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;margin-top:13px">
        ${pf('Effective', 'Mar 15, 2026')}${pf('Affected forms', 'NY IT-204')}${pf('Entity types', 'Partnership')}${pf('Apply mode', 'Review only')}
      </div>
      <div style="margin-top:16px"><div class="lab">Affected clients</div><div style="display:flex;align-items:center;gap:10px;margin-top:9px"><div style="display:flex">${['ls', 'ph', 'mc'].map((k, i) => `<span style="width:26px;height:26px;border-radius:50%;background:#e9edf2 url('${AV[k]}') center/cover;margin-left:${i ? -8 : 0}px;box-shadow:0 0 0 2px #fff;flex-shrink:0;display:inline-block"></span>`).join('')}</div><span style="font-size:13px;color:${INK}">Lone Star Holdings, Patel &amp; Co <span style="color:${MUT}">+1</span></span></div></div>
      <div class="divh"></div>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:${MUT};white-space:nowrap">${ic(I.shield, 13, MUT)}Audit-logged</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <div class="btn sec" style="display:inline-flex;align-items:center;gap:6px;padding:9px 13px;font-size:13px;white-space:nowrap">${ic(I.send, 13, INK)}Email draft</div>
          <div class="btn pri" style="flex:none;padding:9px 16px;font-size:13px;white-space:nowrap">Mark reviewed</div>
        </div>
      </div>
    </div>
    <div class="float" style="position:absolute;left:648px;top:612px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px"><span style="font-family:'Geist Mono';font-size:11px;font-weight:500;color:${ACC}">98%</span><span style="font-size:11px;color:${MUT}">· High parse confidence</span></div>`)
}
function deadlines() {
  const row = (form, client, sub, av, stripe, level, sInk, sLabel, due, dInk, last) => `<div style="display:flex;align-items:center;gap:13px;padding:13px 22px;${last ? '' : `border-bottom:1px solid ${HAIR}`}"><span style="width:4px;height:30px;border-radius:2px;background:${stripe};flex-shrink:0"></span><span class="chip" style="flex-shrink:0">${form}</span><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${client}</div><div style="font-size:12px;color:${MUT}">${sub}</div></div>${pic(av, 28)}<span style="display:inline-flex;align-items:center;gap:8px;flex-shrink:0;width:104px;color:${sInk}">${ring(level)}<span style="font-size:12.5px;color:${sInk}">${sLabel}</span></span><span style="flex-shrink:0;width:58px;text-align:right;font-size:13px;color:${dInk}" class="num">${due}</span></div>`
  const band = (solid, ink, wash, label, meta) => `<div style="display:flex;align-items:center;gap:9px;padding:8px 22px;background:${wash};border-bottom:1px solid ${HAIR}"><span style="width:7px;height:7px;border-radius:50%;background:${solid}"></span><span style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${ink}">${label}</span><span style="font-size:11px;color:${ink};opacity:.75">${meta}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:252px;max-width:540px">
      <div class="ey" style="margin-bottom:28px">The deadline workbench</div>
      <div class="h" style="font-size:56px">Every filing,<br>triaged <em>by urgency</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">Overdue first. Filed last. Nothing slips.</div>
    </div>
    <div style="position:absolute;left:690px;top:204px;width:508px;height:330px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:668px;top:188px;width:508px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:11px;padding:16px 22px;border-bottom:1px solid ${HAIR}"><span style="font-size:15px;font-weight:600;color:${INK}">Deadlines</span><span style="font-size:12px;font-weight:500;color:${MUT};background:#F2F4F7;border-radius:999px;padding:2px 9px">28</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;color:${MUT}">Sort · Urgency <span style="font-size:9px">▾</span></span></div>
      ${band(RED, RED_INK, WRED, 'OVERDUE', '· 5 deadlines')}
      ${row('Form 1040', 'Riverside Sole Prop', 'Sole prop · IRS', 'rp', RED, 'not_started', GRAY, 'Not started', '45d', RED_INK, false)}
      ${row('Form 1065', 'Lone Star Ventures', 'LLC · TX', 'pp', RED, 'in_review', ACC, 'In review', '4d', RED_INK, false)}
      ${band(AMBER, AMBER_INK, WAMB, 'DUE SOON', '· 8 deadlines')}
      ${row('Form 941', 'Patel Holdings', 'Payroll · NY', 'jm', AMBER, 'waiting', AMBER_INK, 'Waiting', 'in 3d', AMBER_INK, false)}
      ${band(GREEN, GREEN_INK, WGRN, 'FILED', '· 15 deadlines')}
      ${row('NY IT-204', 'Kim Consulting', 'Corp · CA', 'pp', GREEN, 'filed', GREEN_INK, 'Filed', 'done', GREEN_INK, true)}
    </div>
    <div class="float" style="position:absolute;right:42px;top:240px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 14px"><span style="font-family:'Geist Mono';font-size:12px;font-weight:500;color:${ACC}">12</span><span style="font-size:11.5px;color:${MUT}">due this week</span></div>
    <div class="float" style="position:absolute;left:756px;top:566px;display:inline-flex;align-items:center;gap:18px;background:#fff;border-radius:999px;padding:10px 19px">${[[RED, '5 overdue'], [AMBER, '8 due soon'], [GREEN, '15 filed']].map(d => `<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;color:${INK}"><span style="width:8px;height:8px;border-radius:50%;background:${d[0]}"></span>${d[1]}</span>`).join('')}</div>`)
}
function security() {
  const arow = (av, avbg, avfg, text, time) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 0">${AV[av] ? pic(av, 30) : `<div class="av" style="width:30px;height:30px;background:${avbg};color:${avfg}">${av}</div>`}<span style="font-size:13.5px;color:${INK}">${text}</span><span style="margin-left:auto;font-size:12px;color:${MUT}" class="num">${time}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:236px;max-width:600px">
      <div class="ey" style="margin-bottom:28px">Built for client trust</div>
      <div class="h" style="font-size:56px">Every date <em>sourced</em>.<br>Every change <em>logged</em>.</div>
      <div class="s" style="margin-top:30px;max-width:380px">No black-box dates. No silent edits.</div>
    </div>
    <div style="position:absolute;left:752px;top:166px;width:446px;height:440px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:730px;top:150px;width:446px;padding:24px 26px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="seal"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg></div>
        <div style="line-height:1.18"><div style="font-size:15px;font-weight:600;color:${INK}">Provenance &amp; audit</div><div style="font-size:12.5px;color:${MUT}">Every decision on the record</div></div>
        <span class="spill" style="margin-left:auto;background:${WGRN};color:${GREEN_INK}"><span style="width:7px;height:7px;border-radius:50%;background:${GREEN}"></span>Verified</span>
      </div>
      <div class="qblk" style="margin-top:18px">
        <div style="font-size:13.5px;color:${INK};line-height:1.5">“The PTET election for tax year 2026 must be made by March 15, 2026.”</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px"><span style="font-size:11.5px;color:${MUT};font-family:'Geist Mono'">tax.ny.gov/bus/ptet</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC}">Open original ${ic(I.ext, 11, ACC)}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px"><span class="lab" style="margin:0">Parse confidence</span><div class="bar" style="flex:1"><i style="width:98%"></i></div><span style="font-size:12.5px;font-weight:500;color:${INK}" class="num">98% · High</span></div>
      <div class="divh"></div>
      <div class="lab">Audit ledger</div>
      <div style="margin-top:6px">
        ${arow('pp',WACC,ACC,'Priya applied the new date','2d')}
        ${arow('AI',WGRN,GREEN_INK,'Matched 3 affected clients','2d')}
        ${arow('✓',WACC,ACC,'Source captured &amp; verified','3d')}
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <span class="spill" style="background:#F2F4F7;color:${INK}">US-East residency</span>
        <span class="spill" style="background:#F2F4F7;color:${INK}">ISO 27001 · in progress</span>
      </div>
    </div>
    <div class="float" style="position:absolute;left:600px;top:402px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px">${ic(I.lock, 13, NAVY)}<span style="font-family:'Geist Mono';font-size:11px;font-weight:500;color:${INK}">a3f9…2e1 · signed</span></div>
    <div class="float" style="position:absolute;left:636px;top:622px;width:236px;background:#fff;border-radius:12px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:9px"><div style="width:30px;height:30px;border-radius:8px;background:${WGRN};display:flex;align-items:center;justify-content:center">${ic(I.check, 16, GREEN_INK, 2.6)}</div><div style="line-height:1.25"><div style="font-size:12.5px;font-weight:500;color:${INK}">New ledger entry</div><div style="font-size:11px;color:${MUT}">Date applied · append-only</div></div><span style="margin-left:auto;font-size:10.5px;color:${MUT}">now</span></div>
    </div>`)
}
function loop() {
  const step = (n, title, body, visual) => `<div class="card" style="display:flex;align-items:center;gap:18px;padding:20px 22px;margin-bottom:16px"><span style="font-family:'Geist Mono',monospace;font-size:22px;font-weight:500;color:${ACC};line-height:1;width:28px;text-align:center;flex-shrink:0">${n}</span><div style="flex:1"><div style="font-size:18px;font-weight:600;color:${INK}">${title}</div><div style="font-size:13.5px;color:${MUT};margin-top:3px">${body}</div></div><div style="flex-shrink:0">${visual}</div></div>`
  const miniMap = `<div style="position:relative;width:64px;height:44px">${[[0,0],[1,0],[3,0],[1,1],[2,1],[0,2],[2,2],[3,1]].map(([c,r],i)=>`<span style="position:absolute;left:${c*16}px;top:${r*16}px;width:12px;height:12px;border-radius:3px;background:${[0,3,5].includes(i)?ACC:'rgba(31,49,92,.12)'}"></span>`).join('')}</div>`
  const avs = `<div style="display:flex">${['ls','ph','mc'].map((k,i)=>`<span style="width:30px;height:30px;border-radius:50%;background:#e9edf2 url('${AV[k]}') center/cover;margin-left:${i?-8:0}px;box-shadow:0 0 0 2px #fff;flex-shrink:0;display:inline-block"></span>`).join('')}</div>`
  const done = `<div style="width:40px;height:40px;border-radius:50%;background:${WGRN};display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:600px">
      <div class="ey" style="margin-bottom:28px">The whole loop</div>
      <div class="h" style="font-size:56px">Monitor. Alert. <em>Apply</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">Hands-off until the one click that matters.</div>
    </div>
    <div style="position:absolute;left:742px;top:204px;width:456px;height:296px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.5"></div>
    <div style="position:absolute;left:720px;top:188px;width:456px">
      ${step('1','Monitor','FED + 50 states + DC, scanned 24/7.',miniMap)}
      ${step('2','Alert','Each change matched to affected clients.',avs)}
      ${step('3','Apply','New dates applied in one click — logged.',done)}
    </div>
    <svg style="position:absolute;left:1166px;top:214px" width="98" height="244" viewBox="0 0 98 244" fill="none">
      <path d="M2 216 C 48 216 68 198 68 158 L 68 70 C 68 30 48 14 8 14" stroke="${ACC}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.5 7"/>
      <path d="M16 5 L5 14 L16 23" stroke="${ACC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="float" style="position:absolute;left:1176px;top:300px;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:6px 12px">${ic(I.refresh, 12, ACC)}<span style="font-size:11px;font-weight:500;color:${INK}">repeats</span></div>`)
}

function coverB() {
  const IVO = '#F3EEE6', IVMUT = 'rgba(243,238,230,.60)'
  return page(`
    <div style="position:absolute;left:0;right:0;top:150px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 16px"><span style="width:7px;height:7px;border-radius:50%;background:${INFO}"></span><span style="font-size:12.5px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${IVO}">For CPA firms · 50 states + DC</span></div>
      <div style="font-family:'Instrument Sans';font-weight:600;font-size:56px;line-height:1.04;letter-spacing:-.022em;color:${IVO};margin-top:30px">Never miss a<br><span style="font-family:'Instrument Serif';font-style:italic;font-weight:400">tax&nbsp;deadline</span>.</div>
      <div style="font-size:18px;color:${IVMUT};margin-top:24px">DueDateHQ watches every agency and tells you who's affected.</div>
    </div>
    <div style="position:absolute;left:445px;top:512px;width:380px;height:210px;border-radius:50%;background:rgba(58,179,224,.20);filter:blur(70px)"></div>
    <div style="position:absolute;left:415px;top:494px;width:440px;background:#fff;border-radius:16px;box-shadow:0 36px 80px -28px rgba(0,0,0,.55),0 10px 30px rgba(0,0,0,.30);padding:22px 24px">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="seal" style="width:32px;height:32px">${ic(I.landmark, 16, '#fff')}</div>
        <div style="line-height:1.18"><div style="font-size:14px;font-weight:600;color:${INK}">IRS · Federal</div><div style="font-size:11.5px;color:${MUT}">New requirement · 2h ago</div></div>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;background:${WAMB};color:${AMBER_INK};font-size:11px;font-weight:500;padding:4px 10px;border-radius:999px"><span style="width:6px;height:6px;border-radius:50%;background:${AMBER}"></span>Needs decision</span>
      </div>
      <div style="font-size:16.5px;font-weight:500;color:${INK};line-height:1.4;margin-top:14px">Schedule K-3 now required for partnerships with foreign activity.</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
        <span style="font-size:12.5px;font-weight:500;color:${INK}">Affects 3 clients</span>
        <div style="display:flex">${['ls', 'ph', 'mc'].map((k, i) => `<span style="width:26px;height:26px;border-radius:50%;background:#e9edf2 url('${AV[k]}') center/cover;margin-left:${i ? -8 : 0}px;box-shadow:0 0 0 2px #fff;flex-shrink:0;display:inline-block"></span>`).join('')}</div>
      </div>
      <div style="display:flex;gap:9px;margin-top:18px">
        <div class="btn pri" style="display:inline-flex;align-items:center;gap:7px;flex:none;padding:11px 16px;font-size:13.5px">${ic(I.check, 14, '#fff', 2.6)}Apply to 3 clients</div>
        <div class="btn sec" style="display:inline-flex;align-items:center;gap:7px;padding:11px 16px;font-size:13.5px">${ic(I.send, 13, INK)}Copy email draft</div>
      </div>
    </div>`, true)
}
// ── NEW · Action layer: apply to every matched client + draft the email (all shipped) ──
function action() {
  const seg = (label) => `<span class="seg" style="color:${INK}">${ic(I.check, 12, GREEN_INK, 2.8)}${label}</span>`
  const crow = (av, name, last) => `<div style="display:flex;align-items:center;gap:10px;padding:8.5px 0;${last ? '' : `border-bottom:1px solid ${HAIR}`}">${pic(av, 24)}<span style="flex:1;min-width:0;font-size:12.5px;font-weight:500;color:${INK}">${name}</span><span class="chip" style="font-size:10px">IT-204</span><span class="num" style="font-size:11.5px;color:${MUT};text-decoration:line-through">Mar 1</span><span style="font-size:10px;color:${MUT}">→</span><span class="num" style="font-size:12.5px;font-weight:600;color:${INK}">Mar 15</span><span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:${WGRN};align-items:center;justify-content:center;flex-shrink:0">${ic(I.check, 10, GREEN_INK, 2.8)}</span></div>`
  const dalert = (code, text, hi) => `<div style="display:flex;align-items:center;gap:11px;padding:11px 18px;border-bottom:1px solid ${HAIR};${hi ? `background:${WACC}` : ''}"><span class="chip" style="font-size:10px;flex-shrink:0">${code}</span><span style="flex:1;min-width:0;font-size:12px;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">Not just alerts</div>
      <div class="h" style="font-size:58px">One click updates<br><em>every client</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">Apply a date change across every matched client at once — and copy a ready client email, without leaving the alert.</div>
    </div>
    <div style="position:absolute;left:618px;top:104px;width:574px;height:632px;background:#fff;border-radius:14px;border:1px solid ${BRD};box-shadow:0 16px 38px -18px rgba(16,24,40,.14);opacity:.5;filter:blur(.8px);overflow:hidden">
      <div style="display:flex;align-items:center;gap:9px;padding:13px 18px;border-bottom:1px solid ${HAIR}"><span style="font-size:14px;font-weight:600;color:${INK}">Alerts</span><span style="font-size:11.5px;color:${MUT}">6 open</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:${GREEN_INK}"><span style="width:6px;height:6px;border-radius:50%;background:${GREEN}"></span>LIVE</span></div>
      ${dalert('IRS', 'Schedule K-3 now required for partnerships with foreign activity')}
      ${dalert('NY', 'NY DTF moves the PTET election window to Mar 15', true)}
      ${dalert('TX', 'Franchise report window extended 30 days')}
      ${dalert('FL', 'FL DOR corporate income-tax bulletin')}
      ${dalert('FED', 'IRS annual inflation-adjustment Revenue Procedure')}
      ${dalert('WA', 'New gross-receipts surtax for tech firms')}
      ${dalert('GA', 'GA DOR e-file schema update')}
    </div>
    <div class="card" style="position:absolute;left:684px;top:138px;width:492px;padding:20px 22px">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="seal" style="width:32px;height:32px">${ic(I.landmark, 16, '#fff')}</div>
        <div style="line-height:1.2"><div style="font-size:14px;font-weight:500;color:${INK}">NY DTF · New York</div><div style="font-size:12px;color:${MUT};display:flex;align-items:center;gap:5px">${ic(I.refresh, 11, MUT)}Form updated</div></div>
        <span class="spill" style="margin-left:auto;background:${WGRN};color:${GREEN_INK}"><span style="width:7px;height:7px;border-radius:50%;background:${GREEN}"></span>Applied</span>
      </div>
      <div style="font-size:16px;font-weight:600;color:${INK};line-height:1.4;margin-top:13px">PTET election window moved to Mar 15.</div>
      <div class="pipe" style="margin-top:13px">${seg('Monitored')}${seg('AI parsed')}${seg('Matched')}${seg('Applied')}</div>
      <div style="display:flex;align-items:center;gap:12px;background:${WGRN};border-radius:10px;padding:13px 14px;margin-top:15px">
        <span style="display:inline-flex;width:26px;height:26px;border-radius:50%;background:#fff;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 4px rgba(63,168,106,.16)">${ic(I.check, 15, GREEN_INK, 2.8)}</span>
        <span style="font-size:14px;font-weight:600;color:${GREEN_INK};line-height:1.3">Applied to 3 clients<br><span style="font-size:11.5px;font-weight:500;opacity:.85">Logged to audit ledger</span></span>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC};white-space:nowrap">${ic(I.refresh, 12, ACC)}Undo</span>
      </div>
      <div style="display:flex;align-items:baseline;margin-top:15px"><span class="lab" style="margin:0">Affected clients · 3</span><span style="margin-left:auto;font-size:10.5px;color:${MUT}">Current &rarr; New</span></div>
      <div style="margin-top:5px">
        ${crow('ls', 'Lone Star Holdings')}
        ${crow('ph', 'Patel &amp; Co')}
        ${crow('mc', 'Maple Creek LLC', true)}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:13px;padding-top:13px;border-top:1px solid ${HAIR}">
        <span style="font-size:11px;color:${MUT}">Client email drafted for all 3</span>
        <div class="btn sec" style="margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:6px;padding:8px 13px;font-size:12.5px">${ic(I.send, 12, INK)}Copy client email draft</div>
      </div>
    </div>`)
}

// ── NEW · Filing readiness: per-deadline doc checklist + materials request (all shipped) ──
function completeness() {
  const rrow = (form, client, sub, stripe, level, sInk, sLabel, last) => `<div style="display:flex;align-items:center;gap:13px;padding:13px 22px;${last ? '' : `border-bottom:1px solid ${HAIR}`}"><span style="width:4px;height:30px;border-radius:2px;background:${stripe};flex-shrink:0"></span><span class="chip" style="flex-shrink:0">${form}</span><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${client}</div><div style="font-size:12px;color:${MUT}">${sub}</div></div><span style="display:inline-flex;align-items:center;gap:8px;flex-shrink:0;color:${sInk}">${ring(level)}<span style="font-size:12.5px;color:${sInk};white-space:nowrap">${sLabel}</span></span></div>`
  const ditem = (label, status) => {
    const cfg = status === 'received'
      ? { ic: `<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:${WGRN};align-items:center;justify-content:center">${ic(I.check, 11, GREEN_INK, 2.8)}</span>`, txt: 'Received', col: GREEN_INK }
      : status === 'needs_review'
        ? { ic: `<span style="display:inline-flex;width:18px;height:18px;border-radius:50%;background:${WAMB};align-items:center;justify-content:center;font-size:11px;color:${AMBER_INK};font-weight:600">!</span>`, txt: 'Needs review', col: AMBER_INK }
        : { ic: `<span style="width:18px;height:18px;border-radius:50%;border:1.5px dashed ${AMBER}"></span>`, txt: 'Missing', col: AMBER_INK }
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0"><span style="flex-shrink:0;display:inline-flex">${cfg.ic}</span><span style="flex:1;font-size:12.5px;color:${INK}">${label}</span><span style="font-size:11.5px;font-weight:500;color:${cfg.col}">${cfg.txt}</span></div>`
  }
  // status progress bar — faithful to PathToFilingSummary: 6 stages, active dark-filled, done gray-check, future faded
  const seg = (label, state, leftSolid, rightSolid, first, last) => {
    const solid = 'rgba(16,24,40,.30)', light = 'rgba(16,24,40,.12)'
    const circle = state === 'active'
      ? `<span style="width:18px;height:18px;border-radius:50%;background:${INK};display:flex;align-items:center;justify-content:center"><span style="width:6px;height:6px;border-radius:50%;background:#fff"></span></span>`
      : state === 'done'
        ? `<span style="width:18px;height:18px;border-radius:50%;background:#F2F4F7;border:1px solid ${BRD};display:flex;align-items:center;justify-content:center">${ic(I.check, 10, MUT, 2.6)}</span>`
        : state === 'skipped'
          ? `<span style="width:18px;height:18px;border-radius:50%;background:#fff;border:1.5px dashed rgba(16,24,40,.3)"></span>`
          : `<span style="width:18px;height:18px;border-radius:50%;background:#fff;border:1px solid ${BRD}"></span>`
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;${state === 'upcoming' || state === 'skipped' ? 'opacity:.55' : ''}"><div style="display:flex;align-items:center;width:100%;gap:3px"><span style="flex:1;height:1.5px;background:${first ? 'transparent' : (leftSolid ? solid : light)}"></span>${circle}<span style="flex:1;height:1.5px;background:${last ? 'transparent' : (rightSolid ? solid : light)}"></span></div><span style="font-size:9.5px;line-height:1.1;text-align:center;color:${state === 'active' ? INK : MUT};font-weight:${state === 'active' ? 600 : 400}">${label}</span></div>`
  }
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:560px">
      <div class="ey" style="margin-bottom:28px">The real blocker</div>
      <div class="h" style="font-size:58px">Know what each<br>filing <em>still needs</em>.</div>
      <div class="s" style="margin-top:30px;max-width:380px">Every deadline tracked doc-by-doc — what&rsquo;s received, what&rsquo;s outstanding, and exactly who to ask.</div>
    </div>
    <div style="position:absolute;left:760px;top:250px;width:360px;height:240px;border-radius:50%;background:rgba(34,72,140,.10);filter:blur(80px)"></div>
    <div style="position:absolute;left:728px;top:160px;width:448px;height:452px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:706px;top:144px;width:448px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:15px 22px;border-bottom:1px solid ${HAIR}"><span class="chip">Form 1065</span><span style="font-size:14.5px;font-weight:600;color:${INK}">Lone Star Ventures</span><span style="margin-left:auto;font-size:12px;color:${MUT}">LLC · TX</span></div>
      <div style="padding:13px 22px 15px;border-bottom:1px solid ${HAIR}">
        <div class="lab" style="margin-bottom:10px">Filing status</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr)">
          ${seg('Not started', 'done', false, true, true, false)}
          ${seg('Waiting', 'active', true, false, false, false)}
          ${seg('Blocked', 'skipped', false, false, false, false)}
          ${seg('Review', 'upcoming', false, false, false, false)}
          ${seg('Filed', 'upcoming', false, false, false, false)}
          ${seg('Done', 'upcoming', false, false, false, true)}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:20px;padding:18px 22px;border-bottom:1px solid ${HAIR}">
        <svg width="92" height="92" viewBox="0 0 92 92" style="flex-shrink:0">
          <circle cx="46" cy="46" r="36" fill="none" stroke="rgba(16,24,40,.10)" stroke-width="9"/>
          <circle cx="46" cy="46" r="36" fill="none" stroke="${GREEN}" stroke-width="9" stroke-linecap="round" stroke-dasharray="113.1 226.2" transform="rotate(-90 46 46)"/>
          <text x="46" y="51" text-anchor="middle" font-family="Instrument Sans,sans-serif" font-size="25" font-weight="600" fill="${INK}">2/4</text>
        </svg>
        <div>
          <div style="font-size:17px;font-weight:600;color:${INK};line-height:1.25">2 of 4 documents in</div>
          <div style="font-size:13px;font-weight:500;color:${AMBER_INK};margin-top:6px">Outstanding: W-2, K-1</div>
          <div style="font-size:12px;color:${MUT};margin-top:4px">Requested 4 days ago · awaiting reply</div>
        </div>
      </div>
      <div style="padding:14px 22px 18px">
        <div class="lab" style="margin-bottom:4px">Materials checklist</div>
        ${ditem('1099-NEC · contractor pay', 'received')}
        ${ditem('Bank statements', 'received')}
        ${ditem('W-2 · wages', 'missing')}
        ${ditem('K-1 · partner shares', 'needs_review')}
        <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid ${HAIR}"><span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:${MUT}">${ic(I.doc, 13, MUT)}Auto-built from the 1065 template</span><div class="btn pri" style="margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:6px;padding:9px 15px;font-size:13px">${ic(I.send, 12, '#fff')}Send materials request</div></div>
      </div>
    </div>`)
}

// ── NEW · Daily Brief: the calm state — when nothing needs you, it says so (shipped /today) ──
function dailyBrief() {
  const fact = (icon, text, tag, tagcol, last) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;${last ? '' : `border-bottom:1px solid ${HAIR}`}"><div style="width:30px;height:30px;border-radius:8px;background:#F2F4F7;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ic(icon, 15, ACC)}</div><span style="flex:1;font-size:13.5px;font-weight:500;color:${INK}">${text}</span><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${tagcol}">${tagcol === GREEN_INK ? ic(I.check, 12, GREEN_INK, 2.6) : ''}${tag}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:258px;max-width:560px">
      <div class="ey" style="margin-bottom:28px">Your morning brief</div>
      <div class="h" style="font-size:56px">When nothing needs<br>you, <em>it says so</em>.</div>
      <div class="s" style="margin-top:30px;max-width:380px">Each day opens with one honest line — what needs you, or that nothing does. No inbox to dig through.</div>
    </div>
    <div style="position:absolute;left:738px;top:188px;width:440px;height:330px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:716px;top:172px;width:440px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:16px 22px;border-bottom:1px solid ${HAIR}">
        <span style="display:inline-flex;align-items:center;gap:7px;background:${WACC};color:${ACC};border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600">${ic(I.news, 14, ACC)}Daily Brief</span>
        <span style="margin-left:auto;font-size:12.5px;font-weight:500;color:${MUT}">Mon · Jun 29</span>
      </div>
      <div style="padding:22px 22px 20px;border-bottom:1px solid ${HAIR}">
        <div style="font-size:23px;font-weight:600;color:${INK};line-height:1.32;letter-spacing:-.01em">All quiet.</div>
        <div style="font-size:14.5px;color:${MUT};line-height:1.45;margin-top:7px">Nothing new needs your attention right now.</div>
      </div>
      <div style="padding:14px 22px 18px">
        <div class="lab" style="margin-bottom:2px">Checked for you this morning</div>
        ${fact(I.landmark, '50 states + federal watched', 'Up to date', GREEN_INK)}
        ${fact(I.bell, 'Source changes triaged', '0 need a decision', GREEN_INK)}
        ${fact(I.cal, '28 deadlines tracked', 'Next in 6 days', MUT, true)}
      </div>
    </div>
    <div class="float" style="position:absolute;right:54px;top:118px;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:7px 13px;font-size:11.5px;font-weight:500;color:${GREEN_INK}">${ic(I.check, 12, GREEN_INK, 2.6)}0 alerts to decide</div>
    <div class="float" style="position:absolute;left:690px;top:556px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px">${ic(I.refresh, 12, ACC)}<span style="font-size:11px;color:${MUT}">Updated 7:00 AM</span></div>`)
}

// ── NEW · Rule library: AI drafts, a human approves every rule (shipped human-in-the-loop) ──
function ruleLibrary() {
  const fact = (l, v) => `<span style="display:inline-flex;align-items:center;gap:6px;background:#F2F4F7;border-radius:8px;padding:6px 10px"><span style="font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${MUT}">${l}</span><span style="font-size:12px;font-weight:500;color:${INK}">${v}</span></span>`
  const jrow2 = (name, n, hi) => `<div style="display:flex;align-items:center;gap:10px;padding:8.5px 18px;border-bottom:1px solid ${HAIR};${hi ? `background:${WACC}` : ''}"><div style="width:22px;height:22px;border-radius:50%;background:${hi ? ACC : '#E2E7EF'};flex-shrink:0"></div><span style="flex:1;min-width:0;font-size:12.5px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span><span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:${MUT}"><span style="width:5px;height:5px;border-radius:50%;background:${AMBER}"></span>${n}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">You stay in control</div>
      <div class="h" style="font-size:58px">Every rule is<br><em>your call</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">We monitor every agency and draft each rule — you accept or reject before it ever touches a client.</div>
    </div>
    <div style="position:absolute;left:618px;top:104px;width:574px;height:632px;background:#fff;border-radius:14px;border:1px solid ${BRD};box-shadow:0 16px 38px -18px rgba(16,24,40,.14);opacity:.5;filter:blur(.8px);overflow:hidden">
      <div style="display:flex;align-items:center;gap:9px;padding:13px 18px;border-bottom:1px solid ${HAIR}"><span style="font-size:14px;font-weight:600;color:${INK}">Jurisdictions</span><span style="margin-left:auto;font-size:11.5px;font-weight:500;color:${MUT}">456 to review</span></div>
      ${jrow2('Federal', 24)}${jrow2('Alabama', 10, true)}${jrow2('Alaska', 3)}${jrow2('Arizona', 9)}${jrow2('Arkansas', 10)}${jrow2('California', 16)}${jrow2('Colorado', 9)}${jrow2('Connecticut', 9)}${jrow2('Delaware', 9)}${jrow2('District of Columbia', 10)}${jrow2('Florida', 6)}${jrow2('Georgia', 10)}${jrow2('Hawaii', 9)}
    </div>
    <div class="card" style="position:absolute;left:684px;top:138px;width:492px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:11px 20px;background:#FAFBFC;border-bottom:1px solid ${HAIR}"><span class="lab" style="margin:0">Review queue</span><span style="margin-left:auto;font-size:12px;font-weight:500;color:${INK}">Rule 3 of 456</span><span style="font-size:12px;color:${MUT}">&lsaquo;&nbsp;&rsaquo;</span></div>
      <div style="display:flex;align-items:center;gap:12px;padding:15px 20px;border-bottom:1px solid ${HAIR}">
        <div style="width:38px;height:38px;border-radius:9px;background:${NAVY};display:flex;align-items:center;justify-content:center;font-family:'Geist Mono';font-size:13px;font-weight:600;color:#F3EEE6;flex-shrink:0">AL</div>
        <div style="line-height:1.25;flex:1;min-width:0"><div style="font-size:15px;font-weight:600;color:${INK}">Individual income tax return</div><div style="font-size:12px;color:${MUT}">Alabama Dept. of Revenue</div></div>
        <span class="spill" style="background:${WAMB};color:${AMBER_INK};flex-shrink:0">${ic(I.clock, 11, AMBER_INK)}Awaiting review</span>
      </div>
      <div style="padding:14px 20px 16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">${fact('Entity', 'Individuals')}${fact('Files', 'Form 1040')}${fact('Effective', 'Jul 15, 2026')}</div>
        <div style="background:${WACC};border:1px solid rgba(34,72,140,.18);border-radius:10px;padding:13px 15px;margin-top:13px">
          <div style="display:flex;align-items:center;gap:7px"><span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:${ACC}">${ic(I.sparkles, 12, ACC)}AI-drafted rule</span><span style="margin-left:auto;font-family:'Geist Mono';font-size:11px;font-weight:500;color:${ACC}">87% · High</span></div>
          <div style="font-size:13.5px;font-weight:500;color:${INK};margin-top:9px;line-height:1.4">Due April 15 — 15th day of the 3rd month after year-end.</div>
          <div style="font-size:12px;font-style:italic;color:${MUT};margin-top:8px;line-height:1.5;font-family:'Instrument Serif',Georgia,serif">&ldquo;Returns are due by April 15 each year.&rdquo;</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:9px">${ic(I.link, 12, MUT)}<span style="font-family:'Geist Mono';font-size:11px;color:${MUT}">revenue.alabama.gov</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:500;color:${ACC}">Open source ${ic(I.ext, 10, ACC)}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span style="width:6px;height:6px;border-radius:50%;background:${ACC};flex-shrink:0"></span><span style="font-size:12px;color:${MUT}">Activates for <b style="font-weight:600;color:${INK}">15 clients</b> · ~15 new deadlines</span></div>
      </div>
      <div style="padding:13px 20px;border-top:1px solid ${HAIR}">
        <div style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:${GREEN_INK}">${ic(I.check, 12, GREEN_INK, 2.6)}Your decision is recorded in the audit log</div>
        <div style="display:flex;gap:9px;margin-top:11px">
          <div class="btn sec" style="flex:none;padding:10px 20px;font-size:13.5px">Reject</div>
          <div class="btn pri" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px;font-size:13.5px">${ic(I.check, 14, '#fff', 2.6)}Accept rule</div>
        </div>
      </div>
    </div>
    <div class="float" style="position:absolute;right:54px;top:116px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 14px">${ic(I.shield, 13, NAVY)}<span style="font-size:11.5px;font-weight:500;color:${INK}">Nothing auto-applies</span></div>`)
}

// ── NEW · Six-status taxonomy: status observed from events, not chosen (shipped) ──
function status6() {
  const VIOLET = '#6D5BD0', VIOLET_INK = '#5A48B0'
  const srow = (level, color, label, meaning, current) => `<div style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:10px;${current ? `background:${WACC}` : ''}"><span style="color:${color};display:inline-flex;flex-shrink:0">${ring(level, 20)}</span><div style="flex:1"><div style="font-size:14.5px;font-weight:500;color:${INK}">${label}</div><div style="font-size:12px;color:${MUT};margin-top:1px">${meaning}</div></div>${current ? `<span class="spill" style="background:#fff;color:${ACC};border:1px solid ${BRD};font-size:11px;padding:4px 10px">Current</span>` : ''}</div>`
  return page(`
    <div style="position:absolute;left:96px;top:248px;max-width:560px">
      <div class="ey" style="margin-bottom:28px">Status, observed not guessed</div>
      <div class="h" style="font-size:56px">Every filing has<br><em>one true status</em>.</div>
      <div class="s" style="margin-top:30px;max-width:380px">Six states, advanced automatically from real events — so the board always matches reality.</div>
    </div>
    <div style="position:absolute;left:722px;top:166px;width:456px;height:404px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:700px;top:150px;width:456px;padding:14px 12px">
      ${srow('not_started', GRAY, 'Not started', 'No work logged yet')}
      ${srow('waiting', AMBER_INK, 'Waiting on client', 'Docs requested — client owes you')}
      ${srow('blocked', RED_INK, 'Blocked', 'Can&rsquo;t proceed — needs a fix')}
      ${srow('in_review', VIOLET_INK, 'In review', 'Prepared — in your review queue', true)}
      ${srow('filed', GREEN_INK, 'Filed', 'Submitted to the agency')}
      ${srow('completed', GREEN_INK, 'Completed', 'Filed &amp; accepted')}
    </div>
    <div class="float" style="position:absolute;left:666px;top:556px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 14px">${ic(I.refresh, 12, ACC)}<span style="font-size:11.5px;font-weight:500;color:${INK}">Auto-advanced from events</span></div>`)
}

// ── NEW · Navy closer: the product philosophy in one line + the offer (bold bookend) ──
function closer() {
  const IVO = '#F3EEE6', IVMUT = 'rgba(243,238,230,.62)'
  return page(`
    <div style="position:absolute;left:435px;top:486px;width:400px;height:220px;border-radius:50%;background:rgba(20,197,246,.22);filter:blur(82px)"></div>
    <div style="position:absolute;left:0;right:0;top:212px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 16px"><span style="width:7px;height:7px;border-radius:50%;background:${CYAN};box-shadow:0 0 8px ${CYAN}"></span><span style="font-size:12.5px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${IVO}">Early access · 50 states + DC</span></div>
      <div style="font-family:'Instrument Sans',sans-serif;font-weight:600;font-size:58px;line-height:1.05;letter-spacing:-.022em;color:${IVO};margin-top:30px;font-size:60px">You handle the judgment.<br>We handle the <span style="font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400">watching</span>.</div>
      <div style="font-size:18px;color:${IVMUT};margin-top:24px;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.5">Every agency monitored 24/7, matched to your clients, sourced and logged — you just decide.</div>
      <div style="display:inline-flex;align-items:center;gap:16px;margin-top:36px">
        <span style="display:inline-flex;align-items:center;gap:8px;background:${CYAN};color:${NAVY};border-radius:10px;padding:13px 24px;font-size:15px;font-weight:600">Get early access ${ic(I.ext, 15, NAVY)}</span>
        <span style="font-size:15px;font-weight:500;color:${IVO}">3 months of Team, free</span>
      </div>
    </div>`, true)
}

// ── Sources: the agency's own notice → the parsed date, with the receipt (shipped provenance) ──
function sources() {
  const pf = (label, val, strong) => `<div><div class="lab">${label}</div><div style="font-size:14px;color:${INK};margin-top:4px;${strong ? 'font-weight:600' : ''}">${val}</div></div>`
  const srow = (chip, name, juris, time) => `<div style="display:flex;align-items:center;gap:12px;padding:10.5px 20px;border-bottom:1px solid ${HAIR}"><span style="width:28px;height:28px;border-radius:7px;background:#F2F4F7;display:flex;align-items:center;justify-content:center;font-family:'Geist Mono';font-size:9.5px;font-weight:600;color:${ACC};flex-shrink:0">${chip}</span><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div><div style="font-size:10.5px;color:${MUT}">${juris}</div></div><span style="font-family:'Geist Mono';font-size:10.5px;color:${MUT}">checked ${time}</span><span style="width:7px;height:7px;border-radius:50%;background:${GREEN};flex-shrink:0"></span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">Straight from the agency</div>
      <div class="h" style="font-size:58px">Every date traces<br>to the <em>source</em>.</div>
      <div class="s" style="margin-top:30px;max-width:368px">Read from the agency&rsquo;s own notice and parsed into the exact date — with the receipt to show any client.</div>
    </div>
    <div style="position:absolute;left:632px;top:104px;width:566px;height:560px;background:#fff;border-radius:14px;border:1px solid ${BRD};box-shadow:0 16px 38px -18px rgba(16,24,40,.14);opacity:.5;filter:blur(0.8px);overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${HAIR}"><span style="font-size:14px;font-weight:600;color:${INK}">Sources</span><span style="font-size:11.5px;font-weight:500;color:${MUT};background:#F2F4F7;border-radius:999px;padding:2px 9px">392</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;color:${GREEN_INK}"><span style="width:7px;height:7px;border-radius:50%;background:${GREEN}"></span>All healthy</span></div>
      ${srow('IRS', 'Internal Revenue Service', 'Federal', '1m')}
      ${srow('NY', 'NY Dept. of Tax &amp; Finance', 'New York', '3m')}
      ${srow('CA', 'CA Franchise Tax Board', 'California', '4m')}
      ${srow('TX', 'TX Comptroller', 'Texas', '6m')}
      ${srow('FL', 'FL Dept. of Revenue', 'Florida', '9m')}
      ${srow('IL', 'IL Dept. of Revenue', 'Illinois', '12m')}
      ${srow('GA', 'GA Dept. of Revenue', 'Georgia', '18m')}
      ${srow('OH', 'OH Dept. of Taxation', 'Ohio', '24m')}
      ${srow('PA', 'PA Dept. of Revenue', 'Pennsylvania', '31m')}
      ${srow('NJ', 'NJ Division of Taxation', 'New Jersey', '40m')}
    </div>
    <div class="card" style="position:absolute;left:706px;top:150px;width:476px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;background:#FAFBFC;border-bottom:1px solid ${HAIR}">
        <div class="seal" style="width:36px;height:36px">${ic(I.landmark, 17, '#fff')}</div>
        <div style="line-height:1.25;min-width:0;flex:1"><div style="font-size:13.5px;font-weight:600;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">NY State Dept. of Taxation &amp; Finance</div><div style="font-size:11.5px;color:${MUT}">New York · government source</div></div>
        <span style="display:inline-flex;align-items:center;gap:6px;border:1px solid ${BRD};border-radius:8px;padding:7px 11px;font-size:12px;font-weight:500;color:${INK};flex-shrink:0">Open original ${ic(I.ext, 11, INK)}</span>
      </div>
      <div class="anc" style="padding:11px 20px 0"><span>Change</span><span class="on">Source</span><span>Activity</span></div>
      <div style="padding:16px 20px 18px">
        <div style="position:relative;background:#F7F9FC;border:1px solid ${HAIR};border-radius:10px;padding:13px 16px 13px 18px">
          <span style="position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:2px;background:${ACC}"></span>
          <div class="lab" style="margin-bottom:7px">Source notice</div>
          <div style="font-size:13.5px;color:${MUT};line-height:1.6">Eligible partnerships may elect into the Pass-Through Entity Tax for 2026. The election must be made by <span style="background:rgba(20,197,246,.30);color:${INK};font-weight:600;padding:1px 5px;border-radius:3px">March&nbsp;15,&nbsp;2026</span>.</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:11px">${ic(I.link, 12, MUT)}<span style="font-family:'Geist Mono';font-size:11px;color:${MUT}">tax.ny.gov/bus/ptet · captured May 16</span></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;padding:7px 0"><span style="width:2px;height:8px;background:${HAIR}"></span><span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:${ACC};background:${WACC};border-radius:999px;padding:3px 11px;margin:3px 0">${ic(I.sparkles, 11, ACC)}Parsed by AI</span><span style="width:2px;height:8px;background:${HAIR}"></span></div>
        <div style="display:flex;align-items:center;gap:12px;background:rgba(20,197,246,.10);border:1px solid rgba(20,197,246,.32);border-radius:10px;padding:12px 16px">
          <div style="flex:1"><div class="lab">Effective date</div><div class="num" style="font-size:19px;font-weight:600;color:${INK};margin-top:2px">Mar 15, 2026</div></div>
          <span style="display:inline-flex;width:24px;height:24px;border-radius:50%;background:${WGRN};align-items:center;justify-content:center">${ic(I.check, 13, GREEN_INK, 2.8)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:13px">
          <span class="spill" style="background:#F2F4F7;color:${INK}">NY IT-204</span>
          <span class="spill" style="background:#F2F4F7;color:${INK}">Partnership</span>
          <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px"><span class="lab" style="margin:0">Confidence</span><div class="bar" style="width:64px"><i style="width:96%"></i></div><span class="num" style="font-size:12px;font-weight:500;color:${INK}">96%</span></span>
        </div>
      </div>
    </div>
`)
}

// ── NEW · Audit log: the real /audit page — append-only ledger, day-grouped rows (shipped) ──
function activity() {
  const TONE = {
    filing: { tile: WGRN, ink: GREEN_INK, ic: I.download, label: 'FILING' },
    decision: { tile: WACC, ink: ACC, ic: I.sparkles, label: 'DECISION' },
    amendment: { tile: WAMB, ink: AMBER_INK, ic: I.penline, label: 'AMENDMENT' },
    access: { tile: '#F2F4F7', ink: MUT, ic: I.key, label: 'ACCESS' },
  }
  const row = (t, time, actor, ai, headline, meta, hash, last) => {
    const T = TONE[t]
    return `<div style="display:flex;gap:11px;padding:8px 0;${last ? '' : `border-bottom:1px solid ${HAIR}`}">
      <span style="width:27px;height:27px;border-radius:7px;background:${T.tile};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${ic(T.ic, 14, T.ink)}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:600;color:${INK}">${actor}</span>
          <span style="font-family:'Geist Mono';font-size:9px;font-weight:600;letter-spacing:.05em;color:${MUT}">${T.label}</span>
          ${ai ? `<span style="display:inline-flex;align-items:center;gap:3px;background:${WACC};color:${ACC};border-radius:4px;padding:0 5px;font-size:9.5px;font-weight:500">${ic(I.sparkles, 8, ACC)}AI</span>` : ''}
          <span style="margin-left:auto;font-family:'Geist Mono';font-size:10.5px;font-weight:500;color:${INK}">${time}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px">
          <span style="flex:1;min-width:0;font-size:12.5px;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${headline}</span>
          <span style="font-family:'Geist Mono';font-size:9.5px;color:${MUT};flex-shrink:0">${meta} · ${hash}</span>
        </div>
      </div>
    </div>`
  }
  const day = (label, n) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 20px;background:#F7F9FC;border-top:1px solid ${HAIR};border-bottom:1px solid ${HAIR}"><span style="font-size:11px;font-weight:600;color:${INK}">${label}</span><span style="font-size:11px;color:${MUT}">${n} events</span></div>`
  const pill = (label) => `<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid ${BRD};border-radius:8px;padding:7px 10px;font-size:11.5px;font-weight:500;color:${INK};white-space:nowrap">${label} <span style="font-size:8px;color:${MUT}">▾</span></span>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">A complete paper trail</div>
      <div class="h" style="font-size:58px">Nothing happens<br><em>off the record</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">Who changed what, when, and why — every event on an append-only audit ledger.</div>
    </div>
    <div style="position:absolute;left:656px;top:136px;width:524px;height:562px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:636px;top:120px;width:524px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:11px;padding:14px 20px;border-bottom:1px solid ${HAIR}"><div style="line-height:1.3"><div style="font-size:15px;font-weight:600;color:${INK}">Audit log</div><div style="font-size:11px;color:${MUT}">Newest practice-wide events first</div></div><span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;border:1px solid ${BRD};border-radius:8px;padding:7px 11px;font-size:12px;font-weight:500;color:${INK}">${ic(I.download, 13, INK)}Export</span></div>
      <div style="display:flex;align-items:center;gap:8px;padding:11px 20px;border-bottom:1px solid ${HAIR}">
        <div style="flex:1;display:flex;align-items:center;gap:8px;background:#F2F4F7;border-radius:8px;padding:8px 11px">${ic(I.search, 13, MUT)}<span style="font-size:12px;color:${MUT}">Filter by person, item, action…</span></div>
        ${pill('All categories')}${pill('Last 7 days')}
      </div>
      ${day('Today · Fri · Jun 5', 5)}
      <div style="padding:3px 20px 6px">
        ${row('filing', '14:23', 'Sarah Martinez', false, 'Deadline status changed to Filed', 'arbor-vale-1040', 'a4f2b1c3')}
        ${row('decision', '13:58', 'Priya Shah', true, 'Alert applied to 3 clients', 'ny-ptet-2026', '9c2e71d0')}
        ${row('amendment', '11:40', 'Marcus Lee', false, '<span style="color:' + AMBER_INK + ';font-weight:600">&Delta;</span> Due date · Mar 1 &rarr; Mar 15', 'obligation', '5f0ab341')}
        ${row('decision', '10:12', 'Priya Shah', false, 'Rule accepted · NY PTET election', 'rule ny-ptet', '1b77e904')}
        ${row('access', '08:31', 'Sarah Martinez', false, 'Signed in', 'session web', 'c3d9a187', true)}
      </div>
      ${day('Yesterday · Thu · Jun 4', 12)}
      <div style="padding:3px 20px 8px">
        ${row('filing', '17:02', 'Marcus Lee', false, 'Form 1120-S e-filed · accepted', 'northstar-1120s', '7a31f0c2')}
        ${row('decision', '15:20', 'Priya Shah', true, 'Matched 3 clients to Schedule K-3', 'irs-k3', 'b90e44a1')}
        ${row('amendment', '11:05', 'Priya Shah', false, '<span style="color:' + AMBER_INK + ';font-weight:600">&Delta;</span> Client jurisdiction · +CA', 'patel-co', '2c8da590', true)}
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:10px 20px;border-top:1px solid ${HAIR}"><span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:${MUT}">${ic(I.shield, 12, MUT)}Append-only</span><span style="font-size:11px;color:${MUT}">Showing 1–8 of 1,284 events</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC}">Export evidence ${ic(I.ext, 11, ACC)}</span></div>
    </div>`)
}

// ── /clients portfolio brought in from the live app — monogram + countdown hero + urgency ──
function clients() {
  const pcard = (mono, mbg, name, sub, num, numTone, numSub, form, due, sLabel, sBg, sInk, done) => `<div style="border:1px solid ${BRD};border-radius:12px;padding:13px 15px;background:#fff">
    <div style="display:flex;align-items:center;gap:9px"><div style="width:30px;height:30px;border-radius:50%;background:${mbg};display:flex;align-items:center;justify-content:center;font-family:'Geist Mono';font-size:11px;font-weight:600;color:#fff;flex-shrink:0">${mono}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div><div style="font-size:11px;color:${MUT}">${sub}</div></div></div>
    <div style="display:flex;align-items:baseline;gap:7px;margin-top:12px;height:30px">${done ? `<span style="display:inline-flex;align-items:center;gap:7px"><span style="display:inline-flex;width:26px;height:26px;border-radius:50%;background:${WGRN};align-items:center;justify-content:center">${ic(I.check, 14, GREEN_INK, 2.8)}</span><span style="font-size:16px;font-weight:600;color:${GREEN_INK}">Filed</span></span>` : `<span class="num" style="font-size:27px;font-weight:600;color:${numTone};line-height:1;letter-spacing:-.02em">${num}</span><span style="font-size:11px;color:${MUT}">${numSub}</span>`}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:11px;border-top:1px solid ${HAIR}"><span class="chip" style="font-size:10px">${form}</span><span style="font-size:11px;color:${MUT}">${due}</span><span class="spill" style="margin-left:auto;background:${sBg};color:${sInk};font-size:10.5px;padding:3px 9px">${sLabel}</span></div>
  </div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">Your whole book</div>
      <div class="h" style="font-size:58px">Every client,<br>by <em>urgency</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">Each client&rsquo;s next deadline, countdown, and status — your entire portfolio in one glance.</div>
    </div>
    <div style="position:absolute;left:760px;top:250px;width:360px;height:240px;border-radius:50%;background:rgba(34,72,140,.10);filter:blur(80px)"></div>
    <div style="position:absolute;left:650px;top:160px;width:526px;height:400px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:628px;top:144px;width:526px;padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:11px;padding:15px 22px;border-bottom:1px solid ${HAIR}"><span style="font-size:15px;font-weight:600;color:${INK}">Clients</span><span style="font-size:12px;font-weight:500;color:${MUT};background:#F2F4F7;border-radius:999px;padding:2px 9px">28</span><span style="margin-left:auto;display:inline-flex;background:#F2F4F7;border-radius:8px;padding:3px"><span style="font-size:11.5px;font-weight:600;color:${INK};background:#fff;border-radius:6px;padding:4px 11px;box-shadow:0 1px 2px rgba(16,24,40,.08)">Cards</span><span style="font-size:11.5px;font-weight:500;color:${MUT};padding:4px 11px">Table</span></span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px 22px">
        ${pcard('RS', '#C0883A', 'Riverside Sole Prop', 'Sole prop · IRS', '3d', RED_INK, 'overdue', 'Form 1040', 'May 12', 'Not started', '#F2F4F7', MUT)}
        ${pcard('LS', '#22488C', 'Lone Star Ventures', 'LLC · TX', '4d', AMBER_INK, 'until due', 'Form 1065', 'Mar 15', 'Waiting', WAMB, AMBER_INK)}
        ${pcard('PH', '#6D5BD0', 'Patel Holdings', 'S-corp · NY', '12d', ACC, 'until due', 'Form 1120-S', 'Apr 1', 'In review', WACC, ACC)}
        ${pcard('KC', '#3FA86A', 'Kim Consulting', 'Corp · CA', '', GREEN_INK, '', 'NY IT-204', 'this period', 'Filed', WGRN, GREEN_INK, true)}
      </div>
    </div>`)
}
// ── /today dashboard brought in from the live app — Good morning · Daily Brief · Priorities ──
function today() {
  const prow = (form, client, sub, level, sInk, sLabel, due, last) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;${last ? '' : `border-bottom:1px solid ${HAIR}`}"><span class="chip" style="flex-shrink:0">${form}</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${client}</div><div style="font-size:11px;color:${MUT}">${sub}</div></div><span style="display:inline-flex;align-items:center;gap:7px;width:106px;flex-shrink:0;color:${sInk}">${ring(level)}<span style="font-size:12px;color:${sInk}">${sLabel}</span></span><span class="num" style="width:60px;text-align:right;flex-shrink:0;font-size:12.5px;color:${RED_INK}">${due}</span></div>`
  const fpill = (l, v, c) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:${MUT}"><span style="width:6px;height:6px;border-radius:50%;background:${c}"></span>${l} <span style="font-weight:600;color:${INK}">${v}</span></span>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:520px">
      <div class="ey" style="margin-bottom:28px">Your morning read</div>
      <div class="h" style="font-size:58px">Everything due today,<br>in one <em>calm read</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">One honest line on what needs you — then the short list that actually does.</div>
    </div>
    <div style="position:absolute;left:760px;top:250px;width:360px;height:240px;border-radius:50%;background:rgba(34,72,140,.10);filter:blur(80px)"></div>
    <div style="position:absolute;left:650px;top:160px;width:526px;height:338px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:628px;top:144px;width:526px;padding:0;overflow:hidden">
      <div style="padding:15px 22px;border-bottom:1px solid ${HAIR}">
        <div style="font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${MUT}">Good morning, Priya</div>
        <div style="display:flex;align-items:baseline;gap:9px;margin-top:3px"><span style="font-size:20px;font-weight:600;color:${INK}">Today</span><span style="font-size:14px;color:${MUT}">June 29</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:11px;padding:13px 22px;border-bottom:1px solid ${HAIR}">
        <span style="display:inline-flex;align-items:center;gap:7px;background:${WACC};color:${ACC};border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;flex-shrink:0">${ic(I.news, 14, ACC)}Daily Brief</span>
        <span style="font-size:13px;color:${INK}">All quiet — nothing new needs your attention right now.</span>
      </div>
      <div style="padding:14px 22px 16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span style="font-size:14px;font-weight:600;color:${INK}">Priorities</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:14px">${fpill('This week', '0', GRAY)}${fpill('This month', '1', AMBER)}${fpill('Overdue', '7', RED)}</span></div>
        <div style="font-size:12px;color:${MUT};margin-bottom:6px">Every overdue deadline is waiting on source documents.</div>
        ${prow('Form 1040', 'Riverside Sole Prop', 'Attach the source document · Docs 0/3', 'not_started', GRAY, 'Not started', '44d late')}
        ${prow('TX PIR/OIR', 'Lone Star Ventures LLC', 'Attach the source document · Docs 0/2', 'not_started', GRAY, 'Not started', '3d late')}
        ${prow('Form 1120', 'Meridian Multistate Corp', 'S-corp · multistate', 'in_review', ACC, 'In review', '44d late', true)}
      </div>
    </div>`)
}

// ════ (superseded) navy browser-window experiment — kept for reference, not in the deck ════
const SIDE_ICONS = [I.search, I.cal, I.bell, I.news, I.landmark, I.shield]
function screen({ eyebrow, title, url, active, content, H = 880 }) {
  const navIcon = (d, i) => `<div style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;${i === active ? `background:${WACC}` : ''}">${ic(d, 17, i === active ? ACC : '#8A93A6')}</div>`
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}
  body{width:1270px;height:${H}px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif;color:${INK};background:${NAVY};
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1.1' fill='%23F3EEE6' fill-opacity='0.05'/%3E%3C/svg%3E")}
  .chip{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:500;color:${INK};background:#fff;border:1px solid ${BRD};border-radius:6px;padding:3px 7px}
  .lab{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${MUT}}
  .num{font-variant-numeric:tabular-nums}
  .pill{display:inline-flex;align-items:center;gap:5px;border:1px solid ${BRD};border-radius:8px;padding:6px 10px;font-size:12px;font-weight:500;color:${INK};white-space:nowrap}
  </style></head><body>
    <div style="position:absolute;right:-70px;top:36px;width:280px;height:130px;border-radius:26px;background:rgba(255,255,255,.045)"></div>
    <div style="position:absolute;right:150px;top:150px;width:210px;height:96px;border-radius:22px;background:rgba(255,255,255,.03)"></div>
    <div style="position:absolute;left:88px;top:66px;max-width:820px">
      <div style="font-size:14px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${CYAN}">${eyebrow}</div>
      <div style="font-family:'Instrument Serif',Georgia,serif;font-weight:400;color:#F3EEE6;line-height:1.08;font-size:52px;margin-top:18px">${title}</div>
    </div>
    <div style="position:absolute;left:88px;top:248px;width:1094px;height:${H - 208}px;background:#fff;border-radius:14px 14px 0 0;box-shadow:0 40px 90px -34px rgba(0,0,0,.55);overflow:hidden">
      <div style="display:flex;align-items:center;gap:8px;padding:0 16px;height:42px;background:#F2F4F7;border-bottom:1px solid ${BRD}">
        <span style="width:11px;height:11px;border-radius:50%;background:#E0635A"></span><span style="width:11px;height:11px;border-radius:50%;background:#E3B341"></span><span style="width:11px;height:11px;border-radius:50%;background:#46B17B"></span>
        <span style="margin:0 auto;display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid ${BRD};border-radius:7px;padding:5px 18px;font-size:12px;color:${MUT};min-width:360px;justify-content:center">${ic(I.lock, 11, MUT)}${url}</span>
        <span style="width:56px"></span>
      </div>
      <div style="display:flex;height:calc(100% - 42px)">
        <div style="width:58px;flex-shrink:0;background:#FAFBFC;border-right:1px solid ${HAIR};display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:16px">
          <div style="width:30px;height:30px;border-radius:8px;background:${NAVY};display:flex;align-items:center;justify-content:center;font-family:'Geist Mono';font-size:11px;font-weight:600;color:#F3EEE6">PP</div>
          ${SIDE_ICONS.map(navIcon).join('')}
        </div>
        <div style="flex:1;min-width:0;background:#fff">${content}</div>
      </div>
    </div>
  </body></html>`
}
const A_COUNT = { WA: 1, NY: 1, TX: 1, FL: 1 }
function alertMap(C, S) {
  const tile = (code, col, row, n) => `<div style="position:absolute;left:${col * C}px;top:${row * C}px;width:${S}px;height:${S}px;border-radius:8px;background:${n ? '#DCE8F7' : 'rgba(16,24,40,.05)'};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1"><span style="font-size:8.5px;font-weight:600;color:${n ? ACC : '#9AA4B2'}">${code}</span>${n ? `<span class="num" style="font-size:11px;font-weight:600;color:${ACC};margin-top:1px">${n}</span>` : ''}</div>`
  return Object.entries(TILES).map(([c, [col, row]]) => tile(c, col, row, A_COUNT[c] || 0)).join('') + tile('FED', 2.7, 7, 2)
}
function monitorScreen() {
  const aRow = (code, date, text, action, last) => `<div style="padding:13px 0;${last ? '' : `border-bottom:1px solid ${HAIR}`}"><div style="display:flex;align-items:center;gap:8px"><span class="chip">${code}</span><span class="num" style="margin-left:auto;font-size:11.5px;color:${MUT}">${date}</span></div><div style="font-size:12.5px;color:${INK};line-height:1.45;margin-top:8px">${text}</div><div style="display:inline-flex;align-items:center;gap:6px;margin-top:9px;font-size:12px;font-weight:500;color:${ACC}">${ic(I.refresh, 12, ACC)}${action}</div></div>`
  const leg = (sw, t) => `<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:${sw}"></span>${t}</span>`
  const content = `<div style="padding:20px 24px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:21px;font-weight:600;color:${INK}">Alerts</span><span style="font-size:13px;color:${MUT}">6 open</span>
      <span style="display:inline-flex;align-items:center;gap:5px;background:${WGRN};color:${GREEN_INK};border-radius:999px;padding:3px 9px;font-size:10.5px;font-weight:600"><span style="width:6px;height:6px;border-radius:50%;background:${GREEN}"></span>LIVE</span>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:${MUT}">${ic(I.refresh, 14, MUT)}Alert history</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">
      <span style="font-size:13px;font-weight:600;color:${INK};background:#F2F4F7;border-radius:8px;padding:6px 12px">Review <span style="color:${MUT}">4</span></span>
      <span style="font-size:13px;font-weight:500;color:${MUT};padding:6px 6px">Active 2</span>
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:${INK};margin-left:4px"><span style="width:15px;height:15px;border-radius:4px;background:${ACC};display:inline-flex;align-items:center;justify-content:center">${ic(I.check, 10, '#fff', 3)}</span>Suggested action</span>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px">${ic(I.search, 15, MUT)}<span class="pill">Filters ▾</span><span class="pill">State ▾</span><span class="pill">Sort · Newest ▾</span></span>
    </div>
    <div style="display:flex;gap:22px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:flex-end;gap:11px;margin-bottom:12px;font-size:10.5px;color:${MUT}">${leg('rgba(16,24,40,.05)', '0')}${leg('#DCE8F7', '1')}${leg('#AECBF0', '2–3')}${leg('#E8B765', '4–6')}${leg('#D2553F', '7+')}</div>
        <div style="position:relative;height:336px">${alertMap(40, 34)}</div>
      </div>
      <div style="width:438px;flex-shrink:0;border-left:1px solid ${HAIR};padding-left:22px">
        <div class="lab" style="margin-bottom:6px">Active alerts · 4</div>
        ${aRow('NY', 'May 16', 'NY DTF clarifies the pass-through entity tax (PTET) election window. Low-confidence advisory — review applicability for affected partnerships.', 'Re-issue revised form')}
        ${aRow('FL', 'May 15', 'FL DOR corporate income-tax bulletin. Very-low-confidence extraction — applicability depends on entity status and fiscal year.', 'Re-confirm client scope')}
        ${aRow('FED', 'May 15', 'IRS released the annual inflation-adjustment Revenue Procedure. Review thresholds (gift / estate exclusions, brackets).', 'Review adjusted thresholds')}
        ${aRow('TX', 'May 1', 'TX Comptroller RSS feed degraded — last successful poll 24h ago. No content gap detected; watch this source for follow-up.', 'Review source change', true)}
      </div>
    </div>
  </div>`
  return screen({ eyebrow: 'Regulatory monitoring', title: 'See what changed —<br>and exactly who&rsquo;s affected.', url: 'app.duedatehq.com/alerts', active: 2, content })
}

// ── Brand footer strip (navy): lockup · loop tagline · 4 proof pillars · early-access CTA ──
function footer() {
  const div = `<span style="width:1px;height:24px;background:${BRD};flex-shrink:0"></span>`
  const dot = `<span style="width:3px;height:3px;border-radius:50%;background:rgba(16,24,40,.28)"></span>`
  const feat = (t) => `<span style="font-size:13.5px;font-weight:500;color:${INK};white-space:nowrap">${t}</span>`
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}body{width:1270px;height:96px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif;background:${BG};border-top:1px solid ${HAIR}}</style></head><body>
    <div style="display:flex;align-items:center;gap:18px;height:96px;padding:0 44px">
      <div style="display:flex;align-items:center;gap:11px;flex-shrink:0">${markSvg(26)}${wmk(18)}</div>
      ${div}
      <span style="font-size:13.5px;font-weight:500;color:${MUT};white-space:nowrap">Monitor. Alert. Apply.</span>
      ${div}
      <div style="display:flex;align-items:center;gap:10px;min-width:0">${feat('50 states + DC')}${dot}${feat('Matched to clients')}${dot}${feat('Sourced to the agency')}${dot}${feat('Audit-logged')}</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:16px;flex-shrink:0">
        <span style="display:inline-flex;align-items:center;gap:7px;border:1px solid ${ACC};border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;color:${ACC};white-space:nowrap"><span style="width:7px;height:7px;border-radius:50%;background:${INFO}"></span>Early access open</span>
        ${div}
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-family:'Geist Mono';font-size:12px;color:${MUT};line-height:1.3"><span>duedatehq.com</span><span>hello@duedatehq.com</span></div>
      </div>
    </div>
  </body></html>`
}

const OUTDIR = '/Users/yuqi/dev/due-date-hq-jwl/docs/marketing/product-hunt-launch/images'
// Canonical PH gallery — 8. Cover + 6 content + closer.
// watch everything → from official sources → it acts → who's blocking → you approve → all logged.
const SET = [['1-cover', cover], ['2-today', today], ['3-monitoring', monitoring], ['4-sources', sources], ['5-action', action], ['6-completeness', completeness], ['7-clients', clients], ['8-rules-review', ruleLibrary], ['9-activity', activity], ['10-closer', closer]]
// Alternates (move any entry into SET to add it back to the gallery):
const ALT = [['1b-cover-dark', coverB], ['alert', alert], ['deadlines', deadlines], ['security', security], ['loop', loop], ['daily-brief', dailyBrief], ['status', status6]]
;(async () => {
  const b = await chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1270, height: 820 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  const ALTDIR = `${OUTDIR}/alternates`
  fs.mkdirSync(ALTDIR, { recursive: true })
  const render = async (list, dir, label) => {
    for (const [k, fn] of list) {
      await p.setContent(fn(), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
      await p.screenshot({ path: `${dir}/ph-${label}-${k}.png` })
      fs.writeFileSync(`${dir}/ph-${label}-${k}.html`, fn()); console.log('rendered', label, k)
    }
  }
  await render(SET, OUTDIR, 'final')
  await render(ALT, ALTDIR, 'alt')
  const ctxF = await b.newContext({ viewport: { width: 1270, height: 96 }, deviceScaleFactor: 2 })
  const pF = await ctxF.newPage()
  await pF.setContent(footer(), { waitUntil: 'networkidle' }); await pF.evaluate(() => document.fonts.ready); await pF.waitForTimeout(400)
  await pF.screenshot({ path: `${OUTDIR}/ph-footer.png` })
  fs.writeFileSync(`${OUTDIR}/ph-footer.html`, footer()); console.log('rendered footer')
  await b.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
