# SizeSignal Data Model (MVP)

## 1) events_raw
| Column | Type | Description |
|---|---|---|
| event_id | string | Unique event identifier |
| event_type | enum | `oos_view`, `size_selected_oos`, `notify_submitted`, `restock_alert_sent`, `restock_alert_clicked`, `purchase_attributed` |
| shop_id | string | Shopify store id/domain |
| product_id | string | Shopify product id |
| variant_id | string | Shopify variant id |
| size_label | string | Human-readable size (S/M/L/XL) |
| visitor_hash | string | Anonymized visitor id |
| contact | string | Phone/email for notify events only |
| created_at | datetime | Event timestamp |

## 2) waitlist_contacts
| Column | Type | Description |
|---|---|---|
| shop_id | string | Store id |
| variant_id | string | Variant id |
| contact | string | Phone/email |
| channel | enum | `whatsapp`, `email` |
| consent | boolean | Marketing consent |
| status | enum | `waiting`, `alerted`, `converted`, `unsubscribed` |
| first_seen_at | datetime | Initial opt-in time |
| last_updated_at | datetime | Last status update |

## 3) weekly_rollups
| Column | Type | Description |
|---|---|---|
| week_start | date | Monday start date |
| shop_id | string | Store id |
| variant_id | string | Variant id |
| oos_views | number | Out-of-stock views |
| notify_count | number | Notify signups |
| repeat_checks | number | Repeat visitor checks |
| est_missed_revenue | number | Estimated lost revenue |
| recommended_restock_units | number | Suggested units |
| confidence_score | number | Data confidence indicator |

## Core formulas
- `notify_rate = notify_count / oos_views`
- `est_missed_revenue = oos_views * baseline_conversion_rate * avg_order_value`
- `recommended_restock_units = round(max(notify_count * 2.5, notify_count + repeat_checks * 0.5))`

## Confidence scoring (simple)
- High: `oos_views >= 100` and `notify_count >= 20`
- Medium: `oos_views >= 40` and `notify_count >= 8`
- Low: otherwise

