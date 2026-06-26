const { chromium } = require('@playwright/test')
const OUT = '/Users/yuqi/Desktop'
const NAVY = '#1F315C', INK = '#1A2433', MUT = '#667085', ACC = '#22488C', BG = '#F9FAFB'
const GREEN = '#3FA86A', GREEN_INK = '#1E7A47', AMBER = '#C0883A', AMBER_INK = '#7A5320', RED = '#D2553F', RED_INK = '#B23A28', INFO = '#3AB3E0', INFO_INK = '#0E6E92', GRAY = '#98A2B3'
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
    const dot = on ? `<span style="position:absolute;top:-3px;right:-3px;width:${Math.round(S*0.32)}px;height:${Math.round(S*0.32)}px;border-radius:50%;background:${INFO};box-shadow:0 0 0 2px ${BG}"></span>` : ''
    return `<div style="position:absolute;left:${col*C}px;top:${row*C}px;width:${S}px;height:${S}px;border-radius:${Math.round(S*0.28)}px;background:${on ? 'rgba(16,24,40,.18)' : 'rgba(16,24,40,.08)'}">${dot}</div>`
  }).join('')
}
function page(inner, dark) {
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}
  body{width:1270px;height:760px;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif;color:${MUT};background:${dark ? NAVY : BG};
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1.5' cy='1.5' r='1.1' fill='${dark ? '%23F3EEE6' : '%231F315C'}' fill-opacity='${dark ? '0.06' : '0.055'}'/%3E%3C/svg%3E")}
  .stage{position:relative;width:1270px;height:760px}
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
  </style></head><body><div class="stage">${dark ? LOCK_LIGHT : LOCK}${inner}</div></body></html>`
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
}
function cover() {
  const dim = (sealIc, agency, type, typeIc, title, n, top) => `<div style="position:absolute;left:0;right:0;top:${top}px;display:flex;align-items:center;gap:12px;padding:13px 20px;opacity:.5;border-top:1px solid ${HAIR}"><div style="width:30px;height:30px;border-radius:8px;background:#F2F4F7;display:flex;align-items:center;justify-content:center">${ic(sealIc, 15, NAVY)}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12.5px;font-weight:500;color:${INK}">${agency}</span><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${MUT}">${ic(typeIc, 11, MUT)}${type}</span></div><div style="font-size:13px;color:${MUT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${title}</div></div><span style="font-size:11.5px;font-weight:500;color:${MUT};flex-shrink:0">${n}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:580px">
      <div class="ey" style="margin-bottom:26px">For CPA firms · 50 states + DC</div>
      <div class="h" style="font-size:56px">Never miss a<br><em>tax deadline</em>.</div>
      <div class="s" style="margin-top:28px;max-width:430px">One change, matched to every client it affects.</div>
    </div>
    <div style="position:absolute;left:724px;top:156px;width:448px;height:380px;background:#fff;border-radius:12px;border:1px solid ${BRD};opacity:.55"></div>
    <div class="card" style="position:absolute;left:702px;top:140px;width:470px;height:396px;padding:6px 0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:9px;padding:16px 20px 12px;border-bottom:1px solid ${HAIR}">${ic(I.bell, 17, INK)}<span style="font-size:15px;font-weight:600;color:${INK}">Alerts</span><span style="font-size:12px;font-weight:500;color:${MUT};background:#F2F4F7;border-radius:999px;padding:2px 9px">6</span><span style="display:inline-flex;align-items:center;gap:5px;margin-left:auto;font-size:12px;font-weight:500;color:${INFO_INK}"><span style="width:7px;height:7px;border-radius:50%;background:${INFO}"></span>Live</span></div>
      <div style="position:relative;background:${WACC};box-shadow:inset 3px 0 0 ${ACC};padding:16px 20px 18px">
        <div style="display:flex;align-items:center;gap:11px">
          <div class="seal" style="width:30px;height:30px;border-radius:8px">${ic(I.landmark, 16, '#fff')}</div>
          <div style="line-height:1.15"><div style="font-size:13.5px;font-weight:500;color:${INK}">IRS · Federal</div><div style="font-size:11.5px;color:${MUT};display:flex;align-items:center;gap:5px">${ic(I.filePlus, 11, MUT)}New requirement · 2h ago</div></div>
          <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;background:${WAMB};color:${AMBER_INK};font-size:11px;font-weight:500;padding:4px 10px;border-radius:999px"><span style="width:6px;height:6px;border-radius:50%;background:${AMBER}"></span>Needs decision</span>
        </div>
        <div style="font-size:16px;font-weight:500;color:${INK};line-height:1.4;margin-top:13px">Schedule K-3 now required for all partnership filings.</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:13px">
          <span style="font-size:12.5px;font-weight:500;color:${INK}">Affects 3 clients</span>
          <div style="display:flex">${['ls', 'ph', 'mc'].map((k, i) => `<span style="width:26px;height:26px;border-radius:50%;background:#e9edf2 url('${AV[k]}') center/cover;margin-left:${i ? -8 : 0}px;box-shadow:0 0 0 2px #fff;flex-shrink:0;display:inline-block"></span>`).join('')}</div>
        </div>
        <div style="display:flex;gap:9px;margin-top:16px">
          <div class="btn pri" style="display:inline-flex;align-items:center;gap:7px;flex:none;padding:10px 15px;font-size:13.5px">${ic(I.check, 14, '#fff', 2.6)}Apply to 3 clients</div>
          <div class="btn sec" style="display:inline-flex;align-items:center;gap:7px;padding:10px 15px;font-size:13.5px">${ic(I.send, 13, INK)}Copy email draft</div>
        </div>
      </div>
      ${dim(I.landmark, 'NY DTF', 'Form updated', I.refresh, 'PTET election window moved to Mar 15', '5 clients', 266)}
      ${dim(I.cal, 'TX Comptroller', 'Extension', I.cal, 'Franchise report window extended 30 days', '2 clients', 332)}
    </div>
    <div class="float" style="position:absolute;right:40px;top:258px;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:7px 13px;font-size:11.5px;font-weight:500;color:${GREEN_INK}">${ic(I.check, 12, GREEN_INK, 2.6)}AI matched</div>
    <div class="float" style="position:absolute;left:672px;top:520px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px"><span style="font-family:'Geist Mono';font-size:11px;font-weight:500;color:${ACC}">98%</span><span style="font-size:11px;color:${MUT}">parse confidence</span></div>`)
}
function monitoring() {
  const feed = (chip, text, n, time, last) => `<div style="display:flex;align-items:center;gap:12px;padding:13px 0;${last?'':`border-bottom:1px solid ${HAIR}`}"><span class="chip" style="flex-shrink:0">${chip}</span><span style="flex:1;min-width:0;font-size:13.5px;font-weight:500;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text}</span><span class="spill" style="background:${WACC};color:${ACC};flex-shrink:0">${n} clients</span><span class="num" style="font-size:12px;color:${MUT};width:42px;text-align:right;flex-shrink:0">${time}</span></div>`
  return page(`
    <div style="position:absolute;left:96px;top:262px;max-width:580px">
      <div class="ey" style="margin-bottom:28px">Always-on monitoring</div>
      <div class="h" style="font-size:56px">All 50 states,<br>plus <em>federal</em>.</div>
      <div class="s" style="margin-top:30px;max-width:360px">The IRS, FEMA, and every state agency — watched 24/7.</div>
    </div>
    <div style="position:absolute;left:716px;top:150px;width:460px;height:268px">${cleanMap(36, 28)}</div>
    <div class="float" style="position:absolute;left:961px;top:160px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:10px;padding:6px 12px"><span style="width:7px;height:7px;border-radius:50%;background:${INFO}"></span><span style="font-size:11.5px;font-weight:500;color:${INK}">NY · 5 new</span></div>
    <div style="position:absolute;left:1011px;top:189px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #fff"></div>
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
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC}">View source ${ic(I.ext, 11, ACC)}</span>
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
    <div class="float" style="position:absolute;left:648px;top:612px;display:inline-flex;align-items:center;gap:7px;background:#fff;border-radius:999px;padding:7px 13px"><span style="font-family:'Geist Mono';font-size:11px;font-weight:500;color:${ACC}">98%</span><span style="font-size:11px;color:${MUT}">parse confidence</span></div>`)
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
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px"><span style="font-size:11.5px;color:${MUT};font-family:'Geist Mono'">tax.ny.gov/bus/ptet</span><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:${ACC}">View source ${ic(I.ext, 11, ACC)}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px"><span class="lab" style="margin:0">Parse confidence</span><div class="bar" style="flex:1"><i style="width:98%"></i></div><span style="font-size:12.5px;font-weight:500;color:${INK}" class="num">98%</span></div>
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
      <div style="font-size:16.5px;font-weight:500;color:${INK};line-height:1.4;margin-top:14px">Schedule K-3 now required for all partnership filings.</div>
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
const OUTDIR = '/Users/yuqi/Desktop/DueDateHQ PH/Final'
const SET = [['1-cover', cover], ['1b-cover-dark', coverB], ['2-monitoring', monitoring], ['3-alert', alert], ['4-deadlines', deadlines], ['5-security', security], ['6-loop', loop]]
;(async () => {
  const b = await chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1270, height: 760 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  for (const [k, fn] of SET) {
    await p.setContent(fn(), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
    await p.screenshot({ path: `${OUTDIR}/ph-final-${k}.png` })
    fs.writeFileSync(`${OUTDIR}/ph-final-${k}.html`, fn()); console.log('rendered', k)
  }
  await b.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
