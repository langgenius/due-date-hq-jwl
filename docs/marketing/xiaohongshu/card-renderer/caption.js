/* Caption generator. Consumes the same payload object as renderCard.

   IMPORTANT: every date, form number, notice id and county count is read
   straight from the payload. Nothing here recomputes or rewrites them —
   the card and the caption must never be able to disagree. */

const INDEX_URL = new URL('./county-index.json', import.meta.url).href;
let indexPromise = null;

async function countyNames(state, fips = []) {
  if (!fips.length) return [];
  if (!indexPromise) indexPromise = fetch(INDEX_URL).then((r) => r.json());
  const idx = await indexPromise;
  const byFips = new Map((idx[state]?.counties || []).map((c) => [c.geoid, c]));
  return fips.map((f) => {
    const hit = byFips.get(f);
    if (!hit) throw new Error(`unknown FIPS ${f} in ${state}`);
    return hit.name;
  });
}

/* Inserts a hairline space between CJK and Latin, the way a Chinese typesetter
   would. Digits are deliberately excluded: in this content a digit next to a
   CJK character is always a date or a count (4月15日, 9 个县, 第 7 次), and
   Chinese convention takes no space there. */
function spaceCJK(s) {
  return s
    .replace(/([\u4e00-\u9fff\u3040-\u30ff])([A-Za-z$])/g, '$1 $2')
    .replace(/([A-Za-z%)])([\u4e00-\u9fff\u3040-\u30ff])/g, '$1 $2')
    .replace(/ {2,}/g, ' ');
}

const KIND_ZH = { delay: '延期', correction: '更正', pending: '待定', multi: '延期' };
const KIND_EN = { delay: 'postponed', correction: 'correction', pending: 'pending', multi: 'postponed' };

/* Payload labels are authored in caps for the card (FEDERAL FILING DEADLINE).
   Caption prose needs them back in sentence case. */
const unshout = (s = '') => (/[A-Z]{3,}/.test(s) && s === s.toUpperCase()
  ? s.toLowerCase()
  : s.charAt(0).toLowerCase() + s.slice(1));

const isArchive = (d) => !d.detected || !d.detected.date;

function detectedLineZH(d) {
  if (isArchive(d)) {
    return `${d.publishedAt || '官方'}发布，此为补录归档，非实时播报。\n${d.footer}`;
  }
  return `我们 ${d.detected.date} ${d.detected.time} 监测到该公告。\n${d.footer}`;
}

function detectedLineEN(d) {
  if (isArchive(d)) {
    return `Published ${d.publishedAt || 'by the agency'}. Archived record, not a live alert.\n${d.footer}`;
  }
  return `We picked this up at ${d.detected.time} on ${d.detected.date}. ${d.footer}`;
}

async function zh(d) {
  const kw = KIND_ZH[d.kind] || '延期';
  const seg = [];

  /* 1 — 折叠前唯一可见的一行。必须自己说完整件事。 */
  if (d.kind === 'correction') {
    seg.push(`【${d.source.org} 更正】${d.title[0]}${d.title[1] || ''}：${d.oldDate} → ${d.newDate}`);
  } else if (d.kind === 'pending') {
    seg.push(`【${d.source.org} ${kw}】${d.title.join('')}，${d.oldDate} → ${d.newDate}`);
  } else if (d.kind === 'multi') {
    seg.push(`【${d.source.org} ${kw}】${d.title.join('，')}`);
  } else {
    seg.push(`【${d.source.org} ${kw}】${d.title.join('')}，${d.oldDate} → ${d.newDate}`);
  }

  /* 2 — 实务提示紧跟其后。这是读者点开的唯一理由，不能埋在后面。 */
  if (d.tip) seg.push(`⚠️ ${d.tip.label}：${d.tip.body}`);

  /* 3 — 范围与出处 */
  if (d.kind === 'multi') {
    seg.push((d.rows || [])
      .map((r) => `${r.name}（${r.scope}）→ ${r.date}`).join('\n')
      + `\n公告 ${d.source.noticeId}`);
  } else {
    const parts = [];
    const names = await countyNames(d.map?.state, d.map?.counties || []);
    if (names.length) parts.push(`适用县：${names.join('、')}`);
    if (d.forms?.length) parts.push(`覆盖：${d.forms.join(' / ')}`);
    parts.push(`公告 ${d.source.noticeId}`);
    seg.push(parts.join('\n'));
  }

  /* 4 — 补充要点 */
  const ex = d.caption?.extras || [];
  if (ex.length) seg.push(ex.map((x) => `· ${x}`).join('\n'));

  /* 5 — 监测时间与引导 */
  seg.push(detectedLineZH(d));
  seg.push('主页有按州整理的全年变更记录。');

  /* 6 — 标签 */
  const tags = (d.caption?.tags || []).map((t) => `#${t}`).join(' ');

  return { body: seg.join('\n\n'), tags, lede: seg[0] };
}

async function en(d) {
  const seg = [];
  const org = d.source.org;

  if (d.kind === 'correction') {
    seg.push(`Correction: our last post gave ${d.oldDate}. `
      + `The ${org} notice says ${d.newDate}.`);
  } else if (d.kind === 'pending') {
    seg.push(`${org} has announced relief but has not set a date yet. `
      + `The original ${d.oldDate} deadline still stands until it does.`);
  } else if (d.kind === 'multi') {
    seg.push(`${org} postponed deadlines across four states — `
      + `and the dates are not the same.`);
  } else {
    seg.push(`The ${org} postponed ${unshout(d.dateLabel || 'filing deadlines')}s `
      + `for ${unshout(d.title[0])} to ${d.newDate}.`);
  }

  if (d.tip) {
    seg.push(`The part most firms miss: ${unshout(d.tip.body)}`);
  }

  if (d.kind === 'multi') {
    seg.push((d.rows || [])
      .map((r) => `${r.name} (${r.scope}) — ${r.date}`).join('\n'));
  }

  seg.push(`Notice ${d.source.noticeId}. ${detectedLineEN(d)}`);

  const tags = (d.caption?.tags || []).slice(0, 3).map((t) => `#${t}`).join(' ');
  return { body: seg.join('\n\n'), tags, lede: seg[0] };
}

const LIMITS = {
  zh: { lede: 48, body: 350 },
  en: { lede: 140, body: 700 },
};

export async function buildCaption(data) {
  const locale = data.locale === 'en' ? 'en' : 'zh';
  const { body, tags, lede } = locale === 'en' ? await en(data) : await zh(data);
  const out = locale === 'zh' ? spaceCJK(body) : body;

  const lim = LIMITS[locale];
  const warn = [];
  if (lede.length > lim.lede) {
    warn.push(`lede ${lede.length} chars > ${lim.lede} — 折叠前放不下`);
  }
  if (out.length > lim.body) {
    warn.push(`body ${out.length} chars > ${lim.body}`);
  }
  if (/https?:\/\//.test(out)) warn.push('caption 里不能放 URL');
  if (isArchive(data) && /(监测到|第一时间|picked this up)/.test(out)) {
    warn.push('归档条目不得声称实时监测到');
  }

  return { text: `${out}${tags ? `\n\n${tags}` : ''}`, warnings: warn };
}

export default buildCaption;
