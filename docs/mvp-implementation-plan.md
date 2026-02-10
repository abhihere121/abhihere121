# MVP Implementation Plan (No-Code First)

## Architecture (Phase 1)
- **Capture layer:** Shopify theme app embed + optional Klaviyo form
- **Automation layer:** Make.com scenarios
- **Storage layer:** Google Sheets (later Airtable/Postgres)
- **Messaging layer:** Interakt/WATI WhatsApp templates
- **Reporting layer:** Weekly digest generated from Sheets and sent via Make

## Detailed build steps

### Day 1: Widget + events
1. Add out-of-stock conditional widget in theme.
2. Capture submit payload: `store, product, variant, size, contact, timestamp`.
3. Track views on OOS variant selection.

### Day 2: Data pipeline
1. Create Google Sheet tabs:
   - `events_raw`
   - `waitlist_contacts`
   - `weekly_rollups`
2. Build Make webhook to receive events.
3. Insert normalized rows and deduplicate contacts by variant.

### Day 3: Scoring + report
1. Compute per-variant weekly stats.
2. Apply formulas:
   - `missed_revenue = oos_variant_views * conversion_rate * avg_order_value`
   - `restock_units = notify_count * 2.5`
3. Prepare WhatsApp digest string template.

### Day 4: Recovery automation
1. Add "Mark as Restocked" trigger (sheet button / status column).
2. Send targeted WhatsApp alert to contacts waiting on that variant.
3. Log sends and conversions.

## Data quality and guardrails
- Add event idempotency key (`shop + variant + event_type + minute_bucket + visitor_hash`).
- Add spam protection (rate limit form submissions per visitor).
- Enforce consent checkbox for WhatsApp marketing.

## Exit criteria for MVP launch
- 5 pilot stores connected
- Weekly report delivered for 2 consecutive weeks
- At least 20 actionable restock recommendations generated
- At least one measurable recovered-sale case study

