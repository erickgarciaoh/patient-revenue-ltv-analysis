# Phase 6 - Delivery
# Export the analysis views to static JSON for the data-story (GitHub Pages).
# Uses System.Data.SqlClient + ExecuteScalar so FOR JSON returns the full
# NVARCHAR(MAX) document in one value (no row-splitting, no 256-char truncation).
# Output: docs/data/*.json (UTF-8 without BOM).

$ErrorActionPreference = 'Stop'
$connStr = "Server=XTREMUS\DB001;Database=patient_revenue_ltv;Integrated Security=True;TrustServerCertificate=True"
$outDir  = Join-Path (Get-Location) 'docs\data'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# name -> query. FOR JSON PATH yields an array; WITHOUT_ARRAY_WRAPPER a single object.
$queries = [ordered]@{
  'monthly_summary' = "SELECT year_month, [year], [month], appts_general, appts_specialized, appts_total, unique_patients, revenue_general, revenue_specialized, revenue_total FROM analysis.vw_monthly_executive_summary ORDER BY year_month FOR JSON PATH"
  'conversion_funnel' = "SELECT stage_order, stage_name, n_patients, pct_of_total FROM analysis.vw_conversion_funnel ORDER BY stage_order FOR JSON PATH"
  'ltv_waterfall' = "SELECT step_order, step_name, step_type, step_value, running_total FROM analysis.vw_ltv_waterfall ORDER BY step_order FOR JSON PATH"
  'ltv_drivers' = "SELECT gen_visits_per_patient, avg_general_ticket, general_component, conversion_rate_pct, spec_visits_per_converter, avg_specialized_ticket, specialized_component FROM analysis.vw_ltv_waterfall_drivers FOR JSON PATH, WITHOUT_ARRAY_WRAPPER"
  'cohort_retention' = "SELECT cohort_month, cohort_size, month_offset, active_patients, retention_pct FROM analysis.vw_cohort_retention ORDER BY cohort_month, month_offset FOR JSON PATH"
  'revenue_pareto' = "SELECT MAX(patient_pct) AS pct_patients, MAX(cumulative_pct_revenue) AS cum_pct_revenue FROM (SELECT NTILE(100) OVER (ORDER BY revenue_rank) AS bucket, patient_pct, cumulative_pct_revenue FROM analysis.vw_revenue_pareto) z GROUP BY bucket ORDER BY bucket FOR JSON PATH"
  'target_first_visit' = "SELECT patient_id, first_service_date, appointment_uid, first_visit_type, first_visit_revenue FROM analysis.vw_target_patients_first_visit ORDER BY patient_id FOR JSON PATH"
  'target_projection' = "SELECT patient_id, visit_count, first_visit, last_visit, avg_gap_days, remaining_days, projected_additional_appts, avg_ticket, projected_additional_revenue FROM analysis.vw_target_patients_projection ORDER BY patient_id FOR JSON PATH"
  'kpis' = "SELECT (SELECT COUNT(*) FROM core.dim_patient) AS patients, (SELECT CAST(SUM(revenue) AS decimal(14,2)) FROM core.fact_appointment) AS revenue_total, (SELECT CAST(SUM(revenue) * 1.0 / COUNT(DISTINCT patient_key) AS decimal(12,2)) FROM core.fact_appointment) AS ltv_avg, (SELECT pct_of_total FROM analysis.vw_conversion_funnel WHERE stage_order = 3) AS conversion_pct, (SELECT COUNT(*) FROM analysis.vw_monthly_executive_summary) AS months FOR JSON PATH, WITHOUT_ARRAY_WRAPPER"
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$cn = New-Object System.Data.SqlClient.SqlConnection $connStr
$cn.Open()
try {
  foreach ($name in $queries.Keys) {
    $cmd = $cn.CreateCommand()
    # Wrap as a scalar subquery so FOR JSON returns the whole document in one
    # value; an unwrapped FOR JSON splits into 2033-char rows and ExecuteScalar
    # would read only the first chunk.
    $cmd.CommandText = "SELECT (" + $queries[$name] + ")"
    $doc = $cmd.ExecuteScalar()
    if ([string]::IsNullOrEmpty($doc)) { throw "Empty result for '$name'" }
    $path = Join-Path $outDir "$name.json"
    [System.IO.File]::WriteAllText($path, $doc, $utf8)
    "{0,-20} {1,7} chars -> docs/data/{0}.json" -f $name, $doc.Length
  }
} finally {
  $cn.Close()
}