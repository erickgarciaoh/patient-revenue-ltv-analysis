'use strict';

// ---- palette (personal-brand-design tokens) ----
// Categoricals carry equal weight (slate + teal). Amber (`accent`) is reserved
// as the emphasis color: the single datum each view is about — never a rotation
// color. See PERSONAL_BRAND_DESIGN.md "Data Visualization Palette".
const C = {
  general: '#4a7fa5',          // data-1 slate — General (categorical)
  special: '#3d9e8c',          // data-2 teal — Specialized (categorical)
  accent: '#c27c35',           // emphasis — the focal datum
  generalSoft: 'rgba(74,127,165,.10)',
  ink: '#111827',              // ink-900 — totals / trend line
  steel: '#6b7a8d',            // data-5 — receding neutral
  muted: '#96928a',            // canvas-500
  line: '#d2cfc8',             // canvas-300 — grid / axis
  label: '#263347',            // ink-700 — data labels on light
};

// ---- formatters (en-US) ----
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => '$' + nf0.format(Math.round(n));
const money2 = n => '$' + nf2.format(n);
const pct = n => nf1.format(n) + '%';

const charts = [];
const mk = (id, opt) => { const c = echarts.init(document.getElementById(id)); c.setOption(opt); charts.push(c); return c; };
const baseGrid = { left: 56, right: 24, top: 30, bottom: 40 };
const axisText = { color: '#6e6a62', fontSize: 11, fontFamily: 'Barlow, system-ui, sans-serif' };

// ---- motion ----
// Charts build on scroll (deferred setOption + native ECharts entry animation);
// KPI numbers count up when the hero enters view. Honors reduced-motion.
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const anim = reduceMotion
  ? { animation: false }
  : { animation: true, animationDuration: 900, animationEasing: 'cubicOut', animationDelay: idx => idx * 25, animationDurationUpdate: 300 };

function onView(el, fn, opts) {
  if (!el) return;
  if (reduceMotion || !('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => { if (e.isIntersecting) { obs.unobserve(e.target); fn(); } });
  }, Object.assign({ threshold: 0.2, rootMargin: '0px 0px -12% 0px' }, opts || {}));
  io.observe(el);
}
const deferChart = (id, fn) => onView(document.getElementById(id), fn);

// Drives an element's text from a render(progress) function, progress 0→1.
function tween(el, render, dur) {
  dur = dur || 1100;
  if (!el) return;
  if (reduceMotion) { el.textContent = render(1); return; }
  const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = render(ease(t));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
// Single scalar counting 0→to through a formatter.
const countUp = (el, to, fmt, dur) => tween(el, t => fmt(to * t), dur);

const getJSON = f => fetch('data/' + f + '.json').then(r => r.json());

Promise.all([
  'kpis', 'monthly_summary', 'conversion_funnel', 'ltv_waterfall', 'ltv_drivers',
  'cohort_retention', 'revenue_pareto', 'target_first_visit', 'target_projection'
].map(getJSON)).then(([kpis, monthly, funnel, waterfall, drivers, cohort, pareto, firstVisit, projection]) => {
  renderKpis(kpis);
  renderDrivers(drivers);
  deferChart('chart-monthly', () => chartMonthly(monthly));
  deferChart('chart-funnel', () => chartFunnel(funnel));
  deferChart('chart-waterfall', () => chartWaterfall(waterfall));
  deferChart('chart-cohort', () => chartCohort(cohort));
  deferChart('chart-pareto', () => chartPareto(pareto));
  tableFirstVisit(firstVisit);
  deferChart('chart-projection', () => chartProjection(projection));
  tableProjection(projection);
}).catch(err => {
  console.error('Data load failed:', err);
  ['chart-monthly', 'chart-funnel', 'chart-waterfall', 'chart-cohort', 'chart-pareto', 'chart-projection', 'table-firstvisit', 'table-projection']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<p class="load-error">Couldn\'t load this data. Try refreshing the page.</p>'; });
});

window.addEventListener('resize', () => charts.forEach(c => c.resize()));

// ---- KPIs ----
function renderKpis(k) {
  const items = [
    { to: k.patients, fmt: v => nf0.format(v), l: 'Patients' },
    { to: k.revenue_total, fmt: money0, l: 'Total revenue' },
    { to: k.ltv_avg, fmt: money0, l: 'Average LTV' },
    { to: k.conversion_pct, fmt: pct, l: 'Conversion to specialization' },
    { to: k.months, fmt: v => nf0.format(v) + ' months', l: 'Analyzed window' },
  ];
  const host = document.getElementById('kpis');
  host.innerHTML = items
    .map(it => `<div class="kpi"><div class="v" data-numeric>${it.fmt(reduceMotion ? it.to : 0)}</div><div class="l">${it.l}</div></div>`).join('');
  const vals = host.querySelectorAll('.kpi .v');
  onView(host, () => vals.forEach((el, i) => countUp(el, items[i].to, items[i].fmt)));
}

// ---- Drivers ----
function renderDrivers(d) {
  const cards = [
    { cls: 'is-general', l: 'General visits/patient × ticket',
      render: t => nf2.format(d.gen_visits_per_patient * t) + ' × ' + money2(d.avg_general_ticket * t) },
    { cls: 'is-general', l: 'General component',
      render: t => money2(d.general_component * t) },
    { cls: 'is-special', l: 'Conversion × visits/converter × ticket',
      render: t => pct(d.conversion_rate_pct * t) + ' × ' + nf2.format(d.spec_visits_per_converter * t) + ' × ' + money2(d.avg_specialized_ticket * t) },
    { cls: 'is-special', l: 'Specialized component',
      render: t => money2(d.specialized_component * t) },
  ];
  const host = document.getElementById('drivers');
  host.innerHTML = cards
    .map(c => `<div class="driver ${c.cls}"><div class="dv">${c.render(reduceMotion ? 1 : 0)}</div><div class="dl">${c.l}</div></div>`).join('');
  const dvs = host.querySelectorAll('.driver .dv');
  onView(host, () => cards.forEach((c, i) => tween(dvs[i], c.render)));
}

// ---- 01 Monthly combo ----
function chartMonthly(m) {
  mk('chart-monthly', {
    ...anim,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: p => {
        const x = p[0].axisValue; let s = `<b>${x}</b>`;
        p.forEach(it => {
          const v = it.seriesName === 'Revenue' ? money0(it.value) : nf0.format(it.value);
          s += `<br/>${it.marker}${it.seriesName}: ${v}`;
        });
        return s;
      } },
    legend: { data: ['General', 'Specialized', 'Revenue'], top: 0, icon: 'roundRect', textStyle: axisText },
    grid: { ...baseGrid, right: 64, top: 36 },
    xAxis: { type: 'category', data: m.map(r => r.year_month), axisLabel: { ...axisText, rotate: 45 }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: [
      { type: 'value', name: 'Appts', nameTextStyle: axisText, axisLabel: axisText, splitLine: { lineStyle: { color: C.line } } },
      { type: 'value', name: 'Revenue', nameTextStyle: axisText, position: 'right', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v / 1000) + 'k' }, splitLine: { show: false } },
    ],
    series: [
      { name: 'General', type: 'bar', stack: 'a', data: m.map(r => r.appts_general), itemStyle: { color: C.general } },
      { name: 'Specialized', type: 'bar', stack: 'a', data: m.map(r => r.appts_specialized), itemStyle: { color: C.special } },
      { name: 'Revenue', type: 'line', yAxisIndex: 1, data: m.map(r => r.revenue_total), smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3, color: C.ink }, itemStyle: { color: C.ink } },
    ],
  });
}

// ---- 02 Funnel ----
function chartFunnel(f) {
  const names = { 'Total patients': 'Total patients', 'With general (T1)': 'Reached general', 'With specialized (T2)': 'Reached specialization' };
  mk('chart-funnel', {
    ...anim,
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/><b>${nf0.format(p.value)}</b> patients (${nf1.format(p.data.pct)}%)` },
    series: [{
      type: 'funnel', top: 10, bottom: 10, left: '8%', width: '84%', minSize: '34%',
      gap: 3, label: { position: 'inside', formatter: p => `${p.name}\n${nf0.format(p.value)} (${nf1.format(p.data.pct)}%)`, color: '#fff', fontWeight: 600, fontSize: 12 },
      data: f.map((r, i) => ({ value: r.n_patients, name: names[r.stage_name] || r.stage_name, pct: r.pct_of_total, itemStyle: { color: [C.steel, C.general, C.accent][i] } })),
    }],
  });
}

// ---- 03 Waterfall ----
function chartWaterfall(w) {
  const labels = { 'Start': 'Start', 'General consultations': 'General consultations', 'Specializations': 'Specializations', 'Average LTV': 'Average LTV' };
  const placeholder = [], values = [], colors = [];
  w.forEach(s => {
    if (s.step_type === 'total') { placeholder.push(0); colors.push(C.ink); }
    else if (s.step_type === 'base') { placeholder.push(0); colors.push('transparent'); }
    else { placeholder.push(s.running_total - s.step_value); colors.push(s.step_name === 'General consultations' ? C.general : C.accent); }
    values.push(s.step_value);
  });
  mk('chart-waterfall', {
    ...anim,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const it = p.find(x => x.seriesName === 'v'); return `${it.axisValue}<br/><b>${money2(it.value)}</b>`; } },
    grid: { ...baseGrid, bottom: 30 },
    xAxis: { type: 'category', data: w.map(s => labels[s.step_name]), axisLabel: { ...axisText, interval: 0 }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v) }, splitLine: { lineStyle: { color: C.line } } },
    series: [
      { name: 'p', type: 'bar', stack: 't', itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: placeholder },
      { name: 'v', type: 'bar', stack: 't', data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 3 } })),
        label: { show: true, position: 'top', formatter: p => money0(p.value), color: C.label, fontWeight: 600, fontSize: 11 } },
    ],
  });
}

// ---- 04 Retention curve (single dominant cohort: 2024-05) ----
// Acquisition was essentially a one-off (1,382 of 1,419 patients start in
// 2024-05), so a multi-cohort heatmap has no material; show the dominant
// cohort's decay curve instead.
function chartCohort(rows) {
  const c = rows.filter(r => r.cohort_month === '2024-05').sort((a, b) => a.month_offset - b.month_offset);
  mk('chart-cohort', {
    ...anim,
    tooltip: { trigger: 'axis', formatter: p => `Month +${p[0].axisValue}<br/><b>${nf1.format(p[0].value)}%</b> of the cohort still active` },
    grid: { ...baseGrid, top: 30, bottom: 46 },
    xAxis: { type: 'category', data: c.map(r => r.month_offset), name: 'Months since first visit', nameLocation: 'middle', nameGap: 30, nameTextStyle: axisText, axisLabel: axisText, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { lineStyle: { color: C.line } } },
    series: [{
      type: 'line', data: c.map(r => r.retention_pct), smooth: true, symbol: 'circle', symbolSize: 7,
      lineStyle: { width: 3, color: C.general }, itemStyle: { color: C.general }, areaStyle: { color: C.generalSoft },
      label: { show: true, position: 'top', formatter: p => nf0.format(p.value) + '%', color: C.label, fontSize: 10, fontWeight: 600 },
    }],
  });
}

// ---- 05 Pareto ----
function chartPareto(p) {
  mk('chart-pareto', {
    ...anim,
    tooltip: { trigger: 'axis', formatter: a => { const it = a.find(x => x.seriesName === 'Cumulative revenue'); return `Top ${nf1.format(it.axisValue)}% of patients<br/><b>${nf1.format(it.value)}%</b> of revenue`; } },
    legend: { data: ['Cumulative revenue', 'Perfect equality'], top: 0, textStyle: axisText },
    grid: { ...baseGrid, top: 36 },
    xAxis: { type: 'value', min: 0, max: 100, name: '% of patients (ranked by revenue)', nameLocation: 'middle', nameGap: 28, nameTextStyle: axisText, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { lineStyle: { color: C.line } } },
    series: [
      { name: 'Perfect equality', type: 'line', data: [[0, 0], [100, 100]], lineStyle: { type: 'dashed', color: C.muted, width: 1.5 }, itemStyle: { color: C.muted }, symbol: 'none', tooltip: { show: false } },
      { name: 'Cumulative revenue', type: 'line', data: p.map(r => [r.pct_patients, r.cum_pct_revenue]), smooth: true, symbol: 'none', lineStyle: { width: 3, color: C.general }, itemStyle: { color: C.general }, areaStyle: { color: C.generalSoft },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: C.accent, type: 'dashed' }, label: { formatter: '80% of revenue', color: '#a3662c', fontSize: 11 }, data: [{ yAxis: 80 }] } },
    ],
  });
}

// ---- 06 First visit table ----
function tableFirstVisit(rows) {
  const head = ['Patient', 'First visit', 'UID', 'Type', 'Revenue'];
  const body = rows.map((r, i) => `<tr>
    <td>#${r.patient_id}</td>
    <td class="num">${r.first_service_date}</td>
    <td class="num">${r.appointment_uid}</td>
    <td><span class="pill general">${r.first_visit_type}</span></td>
    <td class="num" data-anim="fv${i}">${money2(reduceMotion ? r.first_visit_revenue : 0)}</td></tr>`).join('');
  const host = document.getElementById('table-firstvisit');
  host.innerHTML = `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  onView(host, () => rows.forEach((r, i) => countUp(host.querySelector(`[data-anim="fv${i}"]`), r.first_visit_revenue, money2)));
}

// ---- 07 Projection ----
function chartProjection(rows) {
  mk('chart-projection', {
    ...anim,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `Patient #${p[0].axisValue}<br/>${p[0].marker}Projected revenue: <b>${money0(p[0].value)}</b>` },
    grid: { ...baseGrid, top: 16 },
    xAxis: { type: 'category', data: rows.map(r => r.patient_id), axisLabel: { ...axisText, formatter: v => '#' + v }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v / 1000) + 'k' }, splitLine: { lineStyle: { color: C.line } } },
    series: [{ type: 'bar', data: rows.map(r => r.projected_additional_revenue), itemStyle: { color: C.general, borderRadius: [4, 4, 0, 0] }, barWidth: '52%',
      label: { show: true, position: 'top', formatter: p => money0(p.value), color: C.label, fontSize: 10, fontWeight: 600 } }],
  });
}

function tableProjection(rows) {
  const head = ['Patient', 'Visits', 'Last visit', 'Cadence (days)', 'Projected appts', 'Projected revenue'];
  const cols = [
    { key: 'visit_count', fmt: v => nf0.format(v) },
    { key: 'avg_gap_days', fmt: v => nf1.format(v) },
    { key: 'projected_additional_appts', fmt: v => nf0.format(v) },
    { key: 'projected_additional_revenue', fmt: money0 },
  ];
  const cell = (r, i, j) => `<td class="num" data-anim="pj${i}-${j}">${cols[j].fmt(reduceMotion ? r[cols[j].key] : 0)}</td>`;
  const body = rows.map((r, i) => `<tr>
    <td>#${r.patient_id}</td>
    ${cell(r, i, 0)}
    <td class="num">${r.last_visit}</td>
    ${cell(r, i, 1)}
    ${cell(r, i, 2)}
    ${cell(r, i, 3)}</tr>`).join('');
  const host = document.getElementById('table-projection');
  host.innerHTML = `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  onView(host, () => rows.forEach((r, i) => cols.forEach((c, j) =>
    countUp(host.querySelector(`[data-anim="pj${i}-${j}"]`), r[c.key], c.fmt))));
}
