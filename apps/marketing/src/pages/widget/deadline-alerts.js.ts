/**
 * /widget/deadline-alerts.js — the embeddable "IRS deadline changes" widget.
 *
 * One script tag, zero requests: the verified dataset (lib/disaster-notices.ts)
 * is inlined at build time, so embedding sites never hit CORS and the widget
 * renders instantly. Data freshness = marketing deploy cadence, which is exactly
 * when the dataset itself changes.
 *
 * Embed:  <script src="https://duedatehq.com/widget/deadline-alerts.js" async></script>
 * Filter: <script src="..." data-states="LA,GA" async></script>
 * Limit:  <script src="..." data-max="3" async></script>
 *
 * Renders into a Shadow DOM right after the script tag (or into
 * <div id="duedatehq-alerts"></div> if the page provides one), so host-page CSS
 * and the widget's styles can't leak into each other. The footer credit link is
 * the attribution/backlink.
 */
import type { APIRoute } from 'astro'
import { DISASTER_NOTICES } from '../../lib/disaster-notices'

export const GET: APIRoute = () => {
  const data = [...DISASTER_NOTICES]
    .toSorted((a, b) => (a.deadline < b.deadline ? -1 : 1))
    .map((n) => ({
      code: n.code,
      state: n.state,
      abbr: n.abbreviation,
      event: n.event,
      deadline: n.deadline,
      deadlineLabel: n.deadlineLabel,
      area: n.affectedArea,
      url: `https://duedatehq.com/irs-disaster-relief/${n.slug}`,
    }))

  const js = `/*! DueDateHQ deadline-alerts widget — data verified against irs.gov. https://duedatehq.com/widget */
(function () {
  var NOTICES = ${JSON.stringify(data)};
  var script = document.currentScript;
  var host = null;
  var sel = script && script.getAttribute('data-target');
  if (sel) host = document.querySelector(sel);
  if (!host) host = document.getElementById('duedatehq-alerts');
  if (!host || host.shadowRoot) { // no container, or one already claimed by another instance
    host = document.createElement('div');
    if (script && script.parentNode) script.parentNode.insertBefore(host, script.nextSibling);
    else document.body.appendChild(host);
  }
  var states = ((script && script.getAttribute('data-states')) || '')
    .split(',').map(function (s) { return s.trim().toUpperCase(); }).filter(Boolean);
  var max = parseInt((script && script.getAttribute('data-max')) || '0', 10);

  var today = new Date();
  var rows = NOTICES.filter(function (n) {
    if (new Date(n.deadline + 'T23:59:59Z') < today) return false; // live only
    return states.length === 0 || states.indexOf(n.abbr) !== -1;
  });
  if (max > 0) rows = rows.slice(0, max);

  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var css = '.w{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#344054;border:1px solid #E4E7EC;border-radius:12px;overflow:hidden;max-width:460px;background:#fff}' +
    '.h{display:flex;justify-content:space-between;align-items:center;background:#FCFCFD;border-bottom:1px solid #EAECF0;padding:10px 14px;font-size:12px;font-weight:500;color:#344054}' +
    '.h span{color:#98A2B3;font-weight:400}' +
    '.r{display:block;padding:12px 14px;border-bottom:1px solid #F2F4F7;text-decoration:none;color:inherit}' +
    '.r:hover{background:#FCFCFD}.r:last-of-type{border-bottom:0}' +
    '.t{display:flex;align-items:center;gap:8px;font-size:13px}' +
    '.b{display:inline-block;min-width:22px;text-align:center;font-size:10.5px;font-weight:600;color:#2E368C;background:#EEF1FB;border:1px solid #D5DBF3;border-radius:5px;padding:1px 4px}' +
    '.e{color:#101828;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.d{margin-top:3px;font-size:12px;color:#667085}.d b{color:#101828;font-weight:500}' +
    '.soon{color:#B54708}' +
    '.f{padding:9px 14px;font-size:11px;background:#FCFCFD;border-top:1px solid #EAECF0}' +
    '.f a{color:#2E368C;text-decoration:underline}' +
    '.none{padding:14px;font-size:13px;color:#667085}';
  var html = '<div class="w"><div class="h">IRS deadline changes <span>live</span></div>';
  if (rows.length === 0) {
    html += '<div class="none">No live IRS disaster-relief postponements' + (states.length ? ' for ' + states.join(', ') : '') + '.</div>';
  } else {
    rows.forEach(function (n) {
      var days = Math.ceil((new Date(n.deadline + 'T23:59:59Z') - today) / 864e5);
      var soon = days <= 30 ? ' soon' : '';
      html += '<a class="r" href="' + n.url + '" target="_blank" rel="noopener">' +
        '<span class="t"><span class="b">' + n.abbr + '</span><span class="e">' + n.event + '</span></span>' +
        '<span class="d">Postponed to <b>' + n.deadlineLabel + '</b> · <span class="soon' + soon + '">' + days + ' days out</span> · ' + n.code + '</span></a>';
    });
  }
  html += '<div class="f">Verified against irs.gov · <a href="https://duedatehq.com/irs-disaster-relief" target="_blank" rel="noopener">deadline data by DueDateHQ</a></div></div>';
  var style = document.createElement('style'); style.textContent = css;
  var wrap = document.createElement('div'); wrap.innerHTML = html;
  root.appendChild(style); root.appendChild(wrap.firstChild);
})();
`
  return new Response(js, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  })
}
