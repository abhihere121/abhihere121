## What’s missing right now (why it feels like “just the ideation”)
- The frontend pieces don’t speak the same language: [demo.html](file:///c:/Users/aviku/Documents/trae_projects/signal/demo.html) uses a custom demo widget, but the real widget JS expects the Liquid markup + `window.SizeSignalProduct` and a Shopify-style variant selector.
- The backend is only a “logger”: [server.js](file:///c:/Users/aviku/Documents/trae_projects/signal/server.js) logs events but doesn’t create a weekly restock report, doesn’t maintain a waitlist, and doesn’t support the “RESTOCK → send customer alerts” loop.
- Event schema is inconsistent (server expects `event_type`, browser sends `event`).

## Goal of the “complete flow” MVP
Shopper selects OOS size → submits WhatsApp number → data is stored → weekly report is computed → founder message is “sent” → founder marks restock → customers get restock alerts → conversions are tracked.

## Plan
### 1) Unify the frontend so the demo = production
- Update [demo.html](file:///c:/Users/aviku/Documents/trae_projects/signal/demo.html) to render the *same* markup as [notify_me.liquid](file:///c:/Users/aviku/Documents/trae_projects/signal/sizesignal/notify_me.liquid) (same IDs, form fields, consent checkbox).
- Add a Shopify-like variant selector (`select name="id"`) and populate `window.SizeSignalProduct` exactly like the Liquid snippet does, so [size-signal.widget.js](file:///c:/Users/aviku/Documents/trae_projects/signal/sizesignal/size-signal.widget.js) and [size-signal.tracking.js](file:///c:/Users/aviku/Documents/trae_projects/signal/sizesignal/size-signal.tracking.js) work without any demo-specific hacks.

### 2) Fix and formalize the event schema
- Standardize on a single field name: `event` (not `event_type`).
- Add minimal required fields and validate them server-side (timestamp, product_id, variant_id, size_option, page_url).
- Ensure `notify_intent` events also insert the customer into a `waitlist` store keyed by `variant_id`.

### 3) Upgrade the local backend into a real “MVP brain”
- Extend [server.js](file:///c:/Users/aviku/Documents/trae_projects/signal/server.js) to persist data locally (JSONL files) for:
  - `events.jsonl` (all events)
  - `waitlist.jsonl` (opt-ins)
  - `messages.jsonl` (all “sent WhatsApp” messages)
- Add endpoints:
  - `POST /webhook` ingest + persistence
  - `GET /admin` simple dashboard (top missed revenue, top notify intents, last 50 events)
  - `POST /admin/restock` mark variant restocked
  - `POST /admin/send-restock-alerts` send customer alerts for a variant

### 4) Implement weekly report generation (the “holy shit” moment)
- Implement a report builder that aggregates by `variant_id` + `size_option`:
  - OOS visits
  - notify intents
  - missed revenue estimate (configurable AOV; fallback to variant price when available)
  - recommended restock units (configurable multiplier)
- Add:
  - `GET /report/weekly?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `POST /report/send-weekly` to “send WhatsApp” to the founder (locally: log + write to messages)

### 5) Simulate WhatsApp locally (but keep it swappable for Interakt/Wati)
- Create a small “message provider” abstraction:
  - `LocalProvider`: prints to console + writes to `messages.jsonl`
  - later you can plug in Interakt/Wati without rewriting business logic

### 6) Add a true end-to-end verification
- Add a small script that:
  - emits sample events (oos_visit + notify_intent)
  - calls report generation
  - triggers a restock broadcast
  - confirms outputs exist in files and the dashboard shows expected counts

### 7) Update run instructions
- Update [README.md](file:///c:/Users/aviku/Documents/trae_projects/signal/README.md) to reflect:
  - new endpoints
  - how to trigger weekly report
  - how to simulate restock + customer alerts

## Deliverable after this plan
A local server where you can:
- open a product demo page
- capture real OOS demand + waitlist
- view a founder-style weekly report
- click a restock action and see customer WhatsApp alerts “sent”
- see everything persisted locally and inspectable (events/waitlist/messages)

If you approve this plan, I’ll implement it directly in the current repo so your local MVP becomes truly end-to-end.