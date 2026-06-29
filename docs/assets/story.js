'use strict';

// ---- palette ----
const C = { general: '#0f766e', special: '#f59e0b', ink: '#0f172a', muted: '#94a3b8', line: '#e2e8f0', total: '#1e293b' };

// ---- formatters (es) ----
const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => '$' + nf0.format(Math.round(n));
const money2 = n => '$' + nf2.format(n);
const pct = n => nf1.format(n) + '%';

const charts = [];
const mk = (id, opt) => { const c = echarts.init(document.getElementById(id)); c.setOption(opt); charts.push(c); return c; };
const baseGrid = { left: 56, right: 24, top: 30, bottom: 40 };
const axisText = { color: '#475569', fontSize: 11 };

const getJSON = f => fetch('data/' + f + '.json').then(r => r.json());

Promise.all([
  'kpis', 'monthly_summary', 'conversion_funnel', 'ltv_waterfall', 'ltv_drivers',
  'cohort_retention', 'revenue_pareto', 'target_first_visit', 'target_projection'
].map(getJSON)).then(([kpis, monthly, funnel, waterfall, drivers, cohort, pareto, firstVisit, projection]) => {
  renderKpis(kpis);
  renderDrivers(drivers);
  chartMonthly(monthly);
  chartFunnel(funnel);
  chartWaterfall(waterfall);
  chartCohort(cohort);
  chartPareto(pareto);
  tableFirstVisit(firstVisit);
  chartProjection(projection);
  tableProjection(projection);
});

window.addEventListener('resize', () => charts.forEach(c => c.resize()));

// ---- KPIs ----
function renderKpis(k) {
  const items = [
    [nf0.format(k.patients), 'Pacientes'],
    [money0(k.revenue_total), 'Revenue total'],
    [money0(k.ltv_avg), 'LTV promedio'],
    [pct(k.conversion_pct), 'Conversión a especialización'],
    [k.months + ' meses', 'Ventana analizada'],
  ];
  document.getElementById('kpis').innerHTML = items
    .map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
}

// ---- Drivers ----
function renderDrivers(d) {
  const items = [
    ['is-general', nf2.format(d.gen_visits_per_patient) + ' × ' + money2(d.avg_general_ticket), 'Visitas grales./paciente × ticket'],
    ['is-general', money2(d.general_component), 'Componente general'],
    ['is-special', pct(d.conversion_rate_pct) + ' × ' + nf2.format(d.spec_visits_per_converter) + ' × ' + money2(d.avg_specialized_ticket), 'Conversión × visitas/convertido × ticket'],
    ['is-special', money2(d.specialized_component), 'Componente especializado'],
  ];
  document.getElementById('drivers').innerHTML = items
    .map(([cls, v, l]) => `<div class="driver ${cls}"><div class="dv">${v}</div><div class="dl">${l}</div></div>`).join('');
}

// ---- 01 Monthly combo ----
function chartMonthly(m) {
  mk('chart-monthly', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      valueFormatter: undefined,
      formatter: p => {
        const x = p[0].axisValue; let s = `<b>${x}</b>`;
        p.forEach(it => {
          const v = it.seriesName === 'Revenue' ? money0(it.value) : nf0.format(it.value);
          s += `<br/>${it.marker}${it.seriesName}: ${v}`;
        });
        return s;
      } },
    legend: { data: ['General', 'Especializado', 'Revenue'], top: 0, icon: 'roundRect', textStyle: axisText },
    grid: { ...baseGrid, right: 64, top: 36 },
    xAxis: { type: 'category', data: m.map(r => r.year_month), axisLabel: { ...axisText, rotate: 45 }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: [
      { type: 'value', name: 'Citas', nameTextStyle: axisText, axisLabel: axisText, splitLine: { lineStyle: { color: C.line } } },
      { type: 'value', name: 'Revenue', nameTextStyle: axisText, position: 'right', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v / 1000) + 'k' }, splitLine: { show: false } },
    ],
    series: [
      { name: 'General', type: 'bar', stack: 'a', data: m.map(r => r.appts_general), itemStyle: { color: C.general } },
      { name: 'Especializado', type: 'bar', stack: 'a', data: m.map(r => r.appts_specialized), itemStyle: { color: C.special } },
      { name: 'Revenue', type: 'line', yAxisIndex: 1, data: m.map(r => r.revenue_total), smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3, color: C.ink }, itemStyle: { color: C.ink } },
    ],
  });
}

// ---- 02 Funnel ----
function chartFunnel(f) {
  mk('chart-funnel', {
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/><b>${nf0.format(p.value)}</b> pacientes (${nf1.format(p.data.pct)}%)` },
    series: [{
      type: 'funnel', top: 10, bottom: 10, left: '8%', width: '84%', minSize: '34%',
      gap: 3, label: { position: 'inside', formatter: p => `${p.name}\n${nf0.format(p.value)} (${nf1.format(p.data.pct)}%)`, color: '#fff', fontWeight: 600, fontSize: 12 },
      data: f.map((r, i) => ({ value: r.n_patients, name: r.stage_name === 'Total patients' ? 'Pacientes totales' : r.stage_name === 'With general (T1)' ? 'Con consulta general' : 'Con especialización', pct: r.pct_of_total, itemStyle: { color: [C.ink, C.general, C.special][i] } })),
    }],
  });
}

// ---- 03 Waterfall ----
function chartWaterfall(w) {
  const labels = { 'Start': 'Inicio', 'General consultations': 'Consultas generales', 'Specializations': 'Especializaciones', 'Average LTV': 'LTV promedio' };
  const placeholder = [], values = [], colors = [];
  w.forEach(s => {
    if (s.step_type === 'total') { placeholder.push(0); colors.push(C.total); }
    else if (s.step_type === 'base') { placeholder.push(0); colors.push('transparent'); }
    else { placeholder.push(s.running_total - s.step_value); colors.push(s.step_name === 'General consultations' ? C.general : C.special); }
    values.push(s.step_value);
  });
  mk('chart-waterfall', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => { const it = p.find(x => x.seriesName === 'v'); return `${it.axisValue}<br/><b>${money2(it.value)}</b>`; } },
    grid: { ...baseGrid, bottom: 30 },
    xAxis: { type: 'category', data: w.map(s => labels[s.step_name]), axisLabel: { ...axisText, interval: 0 }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v) }, splitLine: { lineStyle: { color: C.line } } },
    series: [
      { name: 'p', type: 'bar', stack: 't', itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: placeholder },
      { name: 'v', type: 'bar', stack: 't', data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 3 } })),
        label: { show: true, position: 'top', formatter: p => money0(p.value), color: '#334155', fontWeight: 600, fontSize: 11 } },
    ],
  });
}

// ---- 04 Retention curve (single dominant cohort: 2024-05) ----
// Acquisition was essentially a one-off (1.382 of 1.419 patients start in
// 2024-05), so multi-cohort heatmap has no material; show the dominant cohort's
// decay curve instead.
function chartCohort(rows) {
  const c = rows.filter(r => r.cohort_month === '2024-05').sort((a, b) => a.month_offset - b.month_offset);
  mk('chart-cohort', {
    tooltip: { trigger: 'axis', formatter: p => `Mes +${p[0].axisValue}<br/><b>${nf1.format(p[0].value)}%</b> de la cohorte sigue activo` },
    grid: { ...baseGrid, top: 30, bottom: 46 },
    xAxis: { type: 'category', data: c.map(r => r.month_offset), name: 'Meses desde la 1ª visita', nameLocation: 'middle', nameGap: 30, nameTextStyle: axisText, axisLabel: axisText, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { lineStyle: { color: C.line } } },
    series: [{
      type: 'line', data: c.map(r => r.retention_pct), smooth: true, symbol: 'circle', symbolSize: 7,
      lineStyle: { width: 3, color: C.general }, itemStyle: { color: C.general }, areaStyle: { color: 'rgba(15,118,110,.10)' },
      label: { show: true, position: 'top', formatter: p => nf0.format(p.value) + '%', color: '#334155', fontSize: 10, fontWeight: 600 },
    }],
  });
}

// ---- 05 Pareto ----
function chartPareto(p) {
  const xs = p.map(r => r.pct_patients);
  mk('chart-pareto', {
    tooltip: { trigger: 'axis', formatter: a => { const it = a.find(x => x.seriesName === 'Revenue acumulado'); return `Top ${nf1.format(it.axisValue)}% pacientes<br/><b>${nf1.format(it.value)}%</b> del revenue`; } },
    legend: { data: ['Revenue acumulado', 'Igualdad perfecta'], top: 0, textStyle: axisText },
    grid: { ...baseGrid, top: 36 },
    xAxis: { type: 'value', min: 0, max: 100, name: '% de pacientes (ordenados por revenue)', nameLocation: 'middle', nameGap: 28, nameTextStyle: axisText, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { ...axisText, formatter: v => v + '%' }, splitLine: { lineStyle: { color: C.line } } },
    series: [
      { name: 'Igualdad perfecta', type: 'line', data: [[0, 0], [100, 100]], lineStyle: { type: 'dashed', color: C.muted, width: 1.5 }, symbol: 'none', tooltip: { show: false } },
      { name: 'Revenue acumulado', type: 'line', data: p.map(r => [r.pct_patients, r.cum_pct_revenue]), smooth: true, symbol: 'none', lineStyle: { width: 3, color: C.general }, areaStyle: { color: 'rgba(15,118,110,.08)' },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: C.special, type: 'dashed' }, label: { formatter: '80% revenue', color: '#92400e', fontSize: 11 }, data: [{ yAxis: 80 }] } },
    ],
  });
}

// ---- 06 First visit table ----
function tableFirstVisit(rows) {
  const head = ['Paciente', '1ª cita', 'UID', 'Tipo', 'Revenue'];
  const body = rows.map(r => `<tr>
    <td>#${r.patient_id}</td>
    <td class="num">${r.first_service_date}</td>
    <td class="num">${r.appointment_uid}</td>
    <td><span class="pill general">${r.first_visit_type === 'General' ? 'General' : r.first_visit_type}</span></td>
    <td class="num">${money2(r.first_visit_revenue)}</td></tr>`).join('');
  document.getElementById('table-firstvisit').innerHTML =
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

// ---- 07 Projection ----
function chartProjection(rows) {
  mk('chart-projection', {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `Paciente #${p[0].axisValue}<br/>${p[0].marker}Revenue proyectado: <b>${money0(p[0].value)}</b>` },
    grid: { ...baseGrid, top: 16 },
    xAxis: { type: 'category', data: rows.map(r => r.patient_id), axisLabel: { ...axisText, formatter: v => '#' + v }, axisLine: { lineStyle: { color: C.line } } },
    yAxis: { type: 'value', axisLabel: { ...axisText, formatter: v => '$' + nf0.format(v / 1000) + 'k' }, splitLine: { lineStyle: { color: C.line } } },
    series: [{ type: 'bar', data: rows.map(r => r.projected_additional_revenue), itemStyle: { color: C.special, borderRadius: [4, 4, 0, 0] }, barWidth: '52%',
      label: { show: true, position: 'top', formatter: p => money0(p.value), color: '#334155', fontSize: 10, fontWeight: 600 } }],
  });
}

function tableProjection(rows) {
  const head = ['Paciente', 'Visitas', 'Última visita', 'Cadencia (días)', 'Citas proyectadas', 'Revenue proyectado'];
  const body = rows.map(r => `<tr>
    <td>#${r.patient_id}</td>
    <td class="num">${r.visit_count}</td>
    <td class="num">${r.last_visit}</td>
    <td class="num">${nf1.format(r.avg_gap_days)}</td>
    <td class="num">${nf0.format(r.projected_additional_appts)}</td>
    <td class="num">${money0(r.projected_additional_revenue)}</td></tr>`).join('');
  document.getElementById('table-projection').innerHTML =
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}
