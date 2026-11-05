# Kibana Dashboard Setup Guide

This guide explains how to create dashboards in Kibana based on the api-gateway logs.

## Prerequisites

1. Ensure Kibana is running at `http://localhost:5601`
2. Verify that logs are being sent to Elasticsearch via Fluentd

## Step 1: Create the Data View (Index Pattern)

1. Go to **Stack Management** → **Data Views**
2. Click **Create data view**
3. Configure:
   - **Name**: `api-gateway-logs`
   - **Index pattern**: `api-gateway-*` or your Fluentd index pattern
   - **Timestamp field**: `timestamp`
4. Click **Create data view**

## Step 2: Verify Log Fields

Your api-gateway logs should have these fields:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | date | Log timestamp |
| `message` | text | Log message |
| `service` | keyword | Service name (api-gateway) |
| `traceId` | keyword | Unique trace ID |
| `sessionId` | keyword | User session ID |
| `correlationId` | keyword | Request correlation ID |
| `metadata.statusCode` | integer | HTTP status code |
| `metadata.responseTime` | integer | Response time in ms |
| `metadata.originalUrl` | keyword | Request URL |
| `metadata.method` | keyword | HTTP method |
| `metadata.userAgent` | text | User agent string |
| `metadata.ip` | keyword | Client IP |
| `metadata.triggerKey` | keyword | Survey trigger key |
| `metadata.path` | keyword | SPA route, on `[Frontend] page_view` lines |

> Frontend logs carry their action in the **message**, as `[Frontend] <action>`
> — there is no `metadata.action` field. Filter on `message`, not on an action
> field, for anything sent by the SPA.

## Step 3: Create Dashboard 1 - API Performance & Health

### Panel 1: Request Throughput (Line Chart)
1. Create new visualization → **Lens**
2. Drag `@timestamp` to X-axis
3. Drag `Count` to Y-axis
4. Set interval to "Auto"
5. Save as "Request Throughput"

### Panel 2: Average Response Time (Metric)
1. Create new visualization → **Metric**
2. Use aggregation: `Average` on `metadata.responseTime`
3. Label: "Avg Response Time (ms)"
4. Save

### Panel 3: Status Code Distribution (Donut)
1. Create new visualization → **Pie**
2. Slice by: `metadata.statusCode` (Terms)
3. Size by: Count
4. Save as "Status Code Distribution"

### Panel 4: Top Endpoints (Horizontal Bar)
1. Create new visualization → **Bar horizontal**
2. X-axis: `metadata.originalUrl` (Terms, Top 10)
3. Y-axis: Count
4. Save as "Top Endpoints"

### Panel 5: Error Logs Table
1. Create visualization → **Data Table**
2. Add columns: `@timestamp`, `message`, `metadata.statusCode`, `metadata.originalUrl`
3. Add filter: `metadata.statusCode >= 400`
4. Save as "Error Logs (4xx/5xx)"

## Step 4: Create Dashboard 2 - User Journey & Engagement

### Panel 1: Active Sessions (Metric)
1. Create new visualization → **Lens**
2. Select **Metric** visualization type
3. Drag `sessionId` to the "Primary metric" field
4. Change function to **Unique count**
5. Save as "Active Sessions"

### Panel 2: User Activity Over Time (Area Chart)
1. Create new visualization → **Lens**
2. Choose **Area** visualization type
3. Drag `@timestamp` to X-axis, set interval to "Hourly"
4. Drag `sessionId` to Y-axis
5. Set function to **Unique count**
6. Save as "Sessions Over Time"

### Panel 3: Most Visited Pages (Bar Chart)
1. Create new visualization → **Lens**
2. Choose **Bar vertical**
3. Drag `metadata.originalUrl` to X-axis
4. Set "Top 10" and order by "Descending"
5. Save as "Top Visited Endpoints"

### Panel 4: Wizard Completions (Bar Chart)
1. Create new visualization → **Lens**
2. Choose **Bar vertical**
3. Add a filter in the visualization: `message: "wizard_completion"` — this
   matches the request line of `/surveys/trigger/wizard_completion`, which is
   emitted exactly once per completed wizard
4. Drag `@timestamp` to X-axis (Daily)
5. Drag `Count` to Y-axis
6. Save as "Daily Wizard Completions"

### Panel 5: Device Details Views (Metric)
1. Create new visualization → **Lens**
2. Choose **Metric**
3. Add filter: `metadata.originalUrl: "/api/devices/*"` (where * is a UUID)
4. Drag `Count` to Metric
5. Save as "Device Detail Page Views"

### Panel 6: User Agents Distribution (Pie)
1. Create new visualization → **Pie**
2. Slice by: `metadata.userAgent` (Terms, Top 5)
3. Save as "Browsers/Devices Breakdown"

## Step 5: Create Dashboard 3 - Survey Insights

### Panel 1: Total Surveys Submitted (Metric)
1. Create new visualization → **Lens**
2. Choose **Metric**
3. Add filter: `message: "submitResponse result"` — the gateway's own log line
   for an accepted response
4. Drag `Count` to Metric
5. Save as "Total Submissions"

### Panel 2: Total Surveys Triggered (Metric)
1. Create new visualization → **Lens**
2. Choose **Metric**
3. Add filter: `metadata.originalUrl: */surveys/trigger/*`
4. Drag `Count` to Metric
5. Save as "Total Triggers"

### Panel 3: Survey Completion Rate (Gauge or Metric)
1. Create new visualization → **Lens**
2. Choose **Formula**
3. Expression: `count(kql='message: "submitResponse result"') / count(kql='metadata.originalUrl: */surveys/trigger/*')`
4. Format as "Percent"
5. Save as "Conversion Rate (%)"

### Panel 4: Submissions Trend (Bar Chart)
1. Create new visualization → **Lens**
2. Choose **Bar vertical**
3. Add filter: `message: "submitResponse result"`
4. Drag `@timestamp` to X-axis (Daily)
5. Save as "Survey Submissions Trend"

### Panel 5: Survey Triggers by Type (Donut)
1. Create new visualization → **Pie**
2. Slice by: `metadata.triggerKey` (Terms)
3. Save as "Triggers by TriggerKey"

### Panel 6: Survey API Latency (Line Chart)
1. Create new visualization → **Lens**
2. Choose **Line**
3. Add filter: `metadata.originalUrl: */surveys/*`
4. Drag `@timestamp` to X-axis
5. Drag `metadata.responseTime` to Y-axis
6. Set function to **Average**
7. Save as "Survey API Performance"

## Step 6: Create Dashboard 4 - Tools Usage & Performance

Tracks the four integrated tools: Device Identification (AI photo recognition), iFixit Tutorials, Fixometer calculator, and Fast Plan Eco route planning.

Log fields produced by these tools:

| Field | Values |
|-------|--------|
| `metadata.category` | `device_identification`, `ifixit`, `fixometer`, `fast_plan_eco` |
| `metadata.event` | See table below |
| `metadata.duration_ms` | Response time in ms |
| `metadata.identified_brand` | Brand detected (device_identification only) |
| `metadata.identified_model` | Model detected (device_identification only) |

**Event names by tool:**

| Tool | Events |
|------|--------|
| Device Identification | `device_identification_request`, `device_identification_success`, `device_identification_failure`, `device_identification_not_found`, `device_identification_no_file` |
| iFixit | `ifixit_search_request/success/failure`, `ifixit_device_view_request/success/failure`, `ifixit_parts_request/success/failure`, `ifixit_guide_view_request/success/failure`, `ifixit_devices_list_request/success/failure` |
| Fixometer | `fixometer_calculation_request/success/failure` |
| Fast Plan Eco | `fast_plan_geocode_request/success/failure`, `fast_plan_route_request/success/failure`, `fast_plan_gpx_request/success/failure`, `fast_plan_maps_request/success/failure` |

### Dashboard panels

| Panel | Type | KQL filter |
|-------|------|------------|
| Photo Identifications | Metric | `metadata.event: device_identification_request` |
| iFixit API Calls | Metric | `metadata.category: ifixit AND NOT metadata.event.keyword: *_failure` |
| Fixometer Calculations | Metric | `metadata.event: fixometer_calculation_request` |
| Fast Plan Eco Calls | Metric | `metadata.category: fast_plan_eco AND NOT metadata.event.keyword: *_failure` |
| Device ID Outcome Breakdown | Donut | `metadata.category: device_identification` (split by `metadata.event`) |
| Device ID Requests Over Time | Area (split by event) | `metadata.category: device_identification` |
| Device ID Avg Recognition Time | Line | `metadata.category: device_identification AND metadata.duration_ms: *` |
| Top Identified Brands | Horizontal bar | `metadata.event: device_identification_success AND metadata.identified_brand: *` |
| iFixit Calls by Endpoint | Horizontal bar | `metadata.category: ifixit AND NOT metadata.event.keyword: *_failure` |
| Fast Plan Eco Calls by Feature | Horizontal bar | `metadata.category: fast_plan_eco AND NOT metadata.event.keyword: *_failure` |
| Fixometer Calculations Over Time | Bar | `metadata.event: fixometer_calculation_request` |
| Tool Errors Over Time | Multi-series bar (split by `metadata.category`) | `metadata.event.keyword: *_failure` |

> **Wildcards need a query, not a filter.** A filter pill built from the field
> list is a `match_phrase`: on a `.keyword` field it is an exact term match, so
> `*_failure*` matches nothing, and negating it excludes nothing. Type these as
> KQL in the query bar (or as a *Custom DSL* filter) so the `*` is a wildcard.
> Note the event names end in `_failure` — a trailing `*` is not needed.

## Step 7: Dashboards 5 and 6 - everything shipped since June

**These two are ready to import**: `post-june-dashboards.ndjson`, in this
folder. Saved Objects -> Import, *Check for existing objects -> Overwrite*.
They bind to the `api-gateway-*` data view by id, so import that first (or
import the prod export, which carries it). The rest of this section documents
what they contain, and is what to follow if you would rather build them by hand.

- **Citizen Journey & Impact** (12 panels): journeys started and declared, the
  declaration rate, avoided CO2, outcomes, barriers, categories, and the AI
  issue tag.
- **Discovery & Assistance** (15 panels): barcode scanning, the phone handoff
  funnel, spare parts, the repairer map and its reports, tutorial alerts and
  the assistant.

| Field | Values |
|-------|--------|
| `metadata.category` | `repair_monitor`, `issue_tag`, `identification_handoff`, `spare_parts`, `repairers`, `notifications` |
| `metadata.event` | See below |

| Area | Events | Notable fields |
|------|--------|----------------|
| Repair tracking | `repair_journey_created`, `repair_journey_declared`, `repair_record_created` | `brand`, `productCategory` (on both events), `repairRoute`, `outcome`, `repairBarrier`, `co2Avoided`, `co2ReferenceCategory` |
| AI issue tag | `issue_tag_request/success/failure` | `duration_ms`, `predicted_label`, `confidence_score` |
| Barcode & phone handoff | `handoff_session_created`, `handoff_photo_submitted`, `handoff_barcode_submitted` | `gtin`, `code_length` |
| Spare parts | `spare_parts_device_search`, `spare_part_viewed` | `brand`, `model`, `result_count`, `sparePartId` |
| Repairer map | `repairer_map_search`, `repairer_reported` | `result_count`, `repairerId`, `reason` |
| Tutorial alerts | `tutorial_subscription_created` | `deviceId`, `issueTypes`, `locale` |

Frontend-only actions, filtered on `message` (they never reach a controller):

| Action | Message | Metadata |
|--------|---------|----------|
| Barcode decoded in the browser | `[Frontend] barcode_scanned` | `gtin`, `code_length`, `format` |
| Assistant opened | `[Frontend] assistant_opened` | `locale` |

### Suggested panels

| Panel | Type | KQL filter |
|-------|------|------------|
| Journeys Started | Metric | `metadata.event: repair_journey_created` |
| Outcomes Declared | Metric | `metadata.event: repair_journey_declared` |
| Declaration Rate | Formula | `count(kql='metadata.event: repair_journey_declared') / count(kql='metadata.event: repair_journey_created')` |
| Outcome Breakdown | Donut | split by `metadata.outcome.keyword` |
| Repair Barriers | Horizontal bar | split by `metadata.repairBarrier.keyword` |
| CO2 Avoided (cumulative) | Metric, `Sum` of `metadata.co2Avoided` | `metadata.event: repair_journey_declared` |
| Top Categories Repaired | Horizontal bar | split by `metadata.productCategory.keyword` |
| Issue Tag Confidence | Line, `Average` of `metadata.confidence_score` | `metadata.event: issue_tag_success` |
| Predicted Issue Origins | Donut | split by `metadata.predicted_label.keyword` |
| Barcode Scans | Bar over time | `metadata.event: handoff_barcode_submitted or message: "[Frontend] barcode_scanned"` |
| Handoff Funnel | Bar | split by `metadata.event.keyword`, filter `metadata.category: identification_handoff` |
| Spare Part Searches with No Result | Metric | `metadata.event: spare_parts_device_search and metadata.result_count: 0` |
| Repairer Map Searches | Bar over time | `metadata.event: repairer_map_search` |
| Repairers Reported | Data table | `metadata.event: repairer_reported` |
| Assistant Opened by Locale | Donut | `message: "[Frontend] assistant_opened"`, split by `metadata.locale.keyword` |

## Step 8: Export Dashboards

After creating dashboards manually:

1. Go to **Stack Management** → **Saved Objects**
2. Select your dashboards
3. Click **Export**
4. Choose "Include related objects"
5. Download the NDJSON file

## KQL Query Examples

```kql
# All errors
metadata.statusCode >= 400

# Specific endpoint
metadata.originalUrl: "/api/devices*"

# Survey events
message: "submitResponse result" or metadata.originalUrl: */surveys/*

# By trace ID
traceId: "your-trace-id"

# By session
sessionId: "your-session-id"

# High latency requests
metadata.responseTime > 1000

# Specific HTTP method
metadata.method: "POST"

# Frontend page views
message: "*page_view*"
```

## Discover Queries

Use **Discover** to explore logs with these saved queries:

1. **Error Investigation**: `metadata.statusCode >= 400 AND service: "api-gateway"`
2. **Survey Funnel**: `metadata.originalUrl: "*surveys*"`
3. **Slow Endpoints**: `metadata.responseTime > 500`
4. **User Journey**: Filter by `sessionId` and sort by `@timestamp`
