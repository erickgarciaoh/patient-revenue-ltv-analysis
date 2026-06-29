# Report Spec — Patient Revenue & LTV (compact dashboard)

## Report identity
- Report name: Patient Revenue & LTV
- Semantic model: patient_revenue_ltv (local PBIP `.SemanticModel`)
- Audience: portfolio / external (recruiters + analysts)
- Primary purpose: tell the revenue → conversion → LTV story at a glance, interactively
- Delivery target: local PBIP first (publish decided later)

## User decisions and constraints
- Scope: single page, compact 16:9 (1280×720)
- Page count: 1
- Interactivity: 2 global slicers (year_month, appointment type); cross-filter on
- Design direction: personal brand, dark dashboard
- Publishing: none yet (local)
- Tooling: powerbi-modeling-mcp (Desktop must be reopened — currently closed), powerbi-report-authoring, Node/pnpm
- Model edit permissions: yes (add helper measures/columns for retention + Pareto)
- Accessibility: WCAG AA contrast; alt text per visual; amber emphasis pattern is value/saturation-based (colorblind-safe)
- Data caveats: Type1=General / Type2=Specialized is a stated (unverified) hypothesis; acquisition is heavily concentrated in the 2024-05 cohort (cohort chart makes this visible); survival/retention deferred to backlog

## Narrative
- Core story: most patients enter via a general consultation; only 29.7% convert to a specialization, and that conversion is the LTV engine.
- Audience promise: read the whole funnel-to-LTV story in one screen, then filter by month/type.
- Key questions: How much revenue and how many patients? What is a patient worth? Who converts? Where does LTV come from? Do patients stay? How concentrated is revenue?

## Design identity (from powerbi-report-design)
- Tone: Editorial Restraint — analytical precision on a dark ink surface, one warm accent
- Signature: tabular Barlow-Thin numerals + Cormorant Garamond display headline; a single amber emphasis per visual
- Brownfield delta: n/a (greenfield report, brand theme pre-built)

## Page plan
1. Patient Revenue & LTV — one page
   - Archetype: Executive Summary (variant B: KPI strip + two-panel mid + three-up bottom)
   - Variant rationale: 5 headline KPIs + a primary trend and a funnel + three equal supporting analyses fit a single-screen executive scan
   - Purpose: revenue→conversion→LTV at a glance
   - Visuals: 5 KPI cards, monthly combo, conversion funnel, LTV components bar, cohort column (patients by first-visit month), Pareto
   - Slicers: dim_date[year_month] dropdown, dim_appointment_type[type_name] tile

## Design system summary
- Theme: `powerbi/theme/patient_revenue_ltv.theme.json` — dark; page #111827, visuals #1C2636, outspace #080C12, text #E7E5E0 / #96928A, borders #374459
- Color semantics: General/Type1 = slate #4A7FA5; Specialized/Type2 = teal #3D9E8C; Total Revenue line = canvas #E7E5E0 (neutral on dark); amber #C27C35 = emphasis only (Conversion KPI accent, funnel specialization stage, specialized LTV bar, Pareto 80% line)
- Typography: display "Cormorant Garamond SemiBold"; body "Barlow"; metrics "Barlow Thin"
- Layout: 12×12 grid, margin 24, gutter 16, snap 8
- Accessibility: AA contrast (canvas-on-ink ~14.6:1; amber-on-ink ~5.1:1); alt text per chart

## Model requirements
- Existing measures (16): Total Revenue, Appointments, Unique Patients, Revenue General/Specialized, Appts General/Specialized, Patients with Specialization, Conversion Rate, Average LTV, LTV General/Specialized Component, Gen Visits per Patient, Avg General Ticket, Spec Visits per Converter, Avg Specialized Ticket
- New measures (3, all light):
  - `Patients with General` = CALCULATE(DISTINCTCOUNT('core fact_appointment'[patient_key]), 'core dim_appointment_type'[type_name] = "General") — funnel intermediate stage
  - `Cohort Patients` = COUNTROWS('core dim_patient') — patients per first-visit month, plotted over dim_patient[cohort_month]
  - `Cumulative Revenue %` = running share of [Total Revenue] over patients ranked desc by their revenue, divided by all-patient revenue — Pareto curve (x = patient rank). DAX validated live before authoring.
- No helper tables: funnel = 3 measures as stages (Unique Patients → Patients with General → Patients with Specialization); LTV components = 2 measures as bars (no category axis).
- Relationship/sort: month_name sorted by month (done); dim_date marked as date table (done)
- Dropped vs first draft: retention (months_since_first column, Active Patients, Retention %) — replaced by Cohort Patients to keep the model light; survival/retention stays in backlog.

## Canonical design contract

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 1
  mode: greenfield
  design_identity:
    tone: Editorial Restraint — analytical precision on dark ink with one warm accent
    signature: Barlow-Thin tabular numerals + Cormorant display headline; single amber emphasis per visual
  archetype: Executive
  color_map:
    - measure: _Measures[Total Revenue]
      color: "#E7E5E0"
      tint: "#374459"
    - measure: _Measures[Revenue General]
      color: "#4A7FA5"
      tint: "#1C2636"
    - measure: _Measures[Revenue Specialized]
      color: "#3D9E8C"
      tint: "#1C2636"
    - measure: _Measures[Appts General]
      color: "#4A7FA5"
      tint: "#1C2636"
    - measure: _Measures[Appts Specialized]
      color: "#3D9E8C"
      tint: "#1C2636"
    - measure: _Measures[Average LTV]
      color: "#E7E5E0"
      tint: "#374459"
    - measure: _Measures[Conversion Rate]
      color: "#C27C35"
      tint: "#2A1E0F"
    - measure: _Measures[LTV General Component]
      color: "#4A7FA5"
      tint: "#1C2636"
    - measure: _Measures[LTV Specialized Component]
      color: "#C27C35"
      tint: "#2A1E0F"
    - measure: _Measures[Cohort Patients]
      color: "#4A7FA5"
      tint: "#1C2636"
    - measure: _Measures[Cumulative Revenue %]
      color: "#4A7FA5"
      tint: "#1C2636"
  pages:
    - name: "Most patients enter general; the 29.7% who specialize drive LTV"
      role: landing
      archetype: Executive
      layout_variant: B
      variant_rationale: "Five headline KPIs + a primary monthly trend and conversion funnel + three equal supporting analyses fit a single-screen executive scan."
      page_background: "#111827"
      layout_summary: "Title+slicers band, 5-card KPI strip, mid row = wide monthly combo + funnel, bottom row = three equal panels (LTV components, retention, Pareto)."
      layout_contract:
        canvas: { width: 1280, height: 720, margin: 24, gutter: 16, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header:  [1, 1, 9, 2]
            filters: [9, 1, 13, 2]
            kpis:    [1, 2, 13, 4]
            combo:   [1, 4, 9, 8]
            funnel:  [9, 4, 13, 8]
            ltv:     [1, 8, 5, 13]
            cohort:  [5, 8, 9, 13]
            pareto:  [9, 8, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "Patient Revenue & LTV — most enter general; the 29.7% who specialize drive LTV"
            purpose: "State the page insight before any chart."
          - id: month_slicer
            region: filters
            kind: slicer
            field_bindings: 'core dim_date'[year_month]
            slicer_type: dropdown
            slot: 1
            of: 2
          - id: type_slicer
            region: filters
            kind: slicer
            field_bindings: 'core dim_appointment_type'[type_name]
            slicer_type: list
            slot: 2
            of: 2
          - id: kpi_revenue
            region: kpis
            kind: cardVisual
            purpose: "How much revenue?"
            field_bindings: _Measures[Total Revenue]
            color_strategy: measure_match
            slot: 1
            of: 5
          - id: kpi_patients
            region: kpis
            kind: cardVisual
            purpose: "How many unique patients?"
            field_bindings: _Measures[Unique Patients]
            color_strategy: none
            slot: 2
            of: 5
          - id: kpi_ltv
            region: kpis
            kind: cardVisual
            purpose: "What is a patient worth on average?"
            field_bindings: _Measures[Average LTV]
            color_strategy: measure_match
            slot: 3
            of: 5
          - id: kpi_conversion
            region: kpis
            kind: cardVisual
            purpose: "What share converts to specialization? (focal KPI)"
            field_bindings: _Measures[Conversion Rate]
            color_strategy: measure_match
            insight_basis: "The central business question; amber-accented as the one KPI that matters."
            slot: 4
            of: 5
          - id: kpi_appts
            region: kpis
            kind: cardVisual
            purpose: "How many appointments?"
            field_bindings: _Measures[Appointments]
            color_strategy: none
            slot: 5
            of: 5
          - id: monthly_combo
            region: combo
            kind: lineClusteredColumnComboChart
            purpose: "How do appointment volume (by type) and revenue trend monthly?"
            field_bindings:
              Category: 'core dim_date'[year_month]
              ColumnY: [_Measures[Appts General], _Measures[Appts Specialized]]
              LineY: _Measures[Total Revenue]
            sort_policy: category_asc
            color_strategy: measure_match
          - id: conversion_funnel
            region: funnel
            kind: funnel
            purpose: "How many patients reach a general consultation vs a specialization?"
            field_bindings:
              Values: [_Measures[Unique Patients], _Measures[Patients with General], _Measures[Patients with Specialization]]
            color_strategy: semantic
            insight_basis: "Multi-measure stages; amber on the final specialization stage — the conversion drop-off is the story."
          - id: ltv_components
            region: ltv
            kind: barChart
            purpose: "Where does average LTV come from — general vs specialized?"
            field_bindings:
              Y: [_Measures[LTV General Component], _Measures[LTV Specialized Component]]
            sort_policy: none
            color_strategy: measure_match
          - id: cohort_bars
            region: cohort
            kind: columnChart
            purpose: "When were patients acquired? (patients by first-visit month)"
            field_bindings:
              Category: 'core dim_patient'[cohort_month]
              Y: _Measures[Cohort Patients]
            sort_policy: category_asc
            color_strategy: measure_match
          - id: revenue_pareto
            region: pareto
            kind: lineChart
            purpose: "How concentrated is revenue across patients (80/20)?"
            field_bindings:
              Category: 'core dim_patient'[patient_id]
              Y: _Measures[Cumulative Revenue %]
            sort_policy: value_desc
            color_strategy: measure_match
            insight_basis: "Amber 80% constant reference line marks the Pareto threshold."
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: combo, pct_of_content: 24 }
          balance_rationale: "KPI strip (2 rows), a wide primary combo paired with the funnel, and three equal bottom panels fill the content area with no dead band; combo is widest as the primary trend but stays under 25% so funnel and the three analyses remain readable."
  interaction_pattern:
    drill_targets: []
    cross_filter_rules: "Slicers Filter all visuals; visual-to-visual Highlight (default)."
  accessibility:
    alt_text_strategy: headline+trend
    contrast_notes: "Canvas #E7E5E0 on ink #111827 ~14.6:1; amber #C27C35 on ink ~5.1:1 (AA); emphasis pattern is saturation-based, colorblind-safe."
  theme:
    base: "powerbi/theme/patient_revenue_ltv.theme.json (custom brand, dark)"
    user_overrides: "Keep brand palette/fonts; amber stays out of the categorical rotation."
```

## Implementation notes
- Model changes: reopen Power BI Desktop (MCP reconnect), add 3 measures (`Patients with General`, `Cohort Patients`, `Cumulative Revenue %`); validate via DAX; persist.
- No helper tables: funnel and LTV components are multi-measure visuals.
- PBIR authoring: via powerbi-report-authoring on the existing `.Report` (Desktop reload-on-change for preview/screenshot).
- Validation: JSON parses, Desktop reload, screenshot the page; check color_map adherence, % formatting, display names, no overlap.
- Desktop screenshot verification: capture the page; fix labels/legends/contrast.
- Publishing boundary: local only.
- Risks: only `Cumulative Revenue %` is non-trivial DAX (validate live); funnel amber on the last stage and Pareto 80% reference line are report-layer formatting, not model.
