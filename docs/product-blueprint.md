# SizeSignal — Product Blueprint

## 1) Problem statement
Indian fashion D2C founders usually restock on intuition and historical sales. They rarely quantify demand that failed to convert when a specific size was out of stock. That creates repeated stockouts and missed revenue.

## 2) Core insight
The most valuable inventory signal is **invisible demand**:
- Product/variant page visits when size is unavailable
- "Notify Me" opt-ins for that variant
- Repeat checks for the same out-of-stock size

## 3) ICP and wedge

### Primary ICP
- Shopify-based Indian fashion brands
- GMV: ₹10L to ₹2Cr/month
- Lean teams where founder or ops lead makes restock decisions

### Beachhead wedge
- Women’s ethnicwear / fast-moving fashion catalogs
- Frequent size stockouts in M/L/XL

## 4) Positioning
SizeSignal is not a generic back-in-stock tool.
It is a **missed-revenue intelligence layer** for restock decisions.

## 5) MVP outcome
By week 1 after install, founder should clearly see:
- Top out-of-stock variants by missed revenue
- Units to restock this week by size/variant
- Potential revenue recovered if restocked

## 6) Jobs to be done
1. As a founder, I want to know which out-of-stock sizes are hurting revenue most.
2. As an ops manager, I want a weekly ranked list of restock priorities.
3. As a marketer, I want to alert waitlisted customers instantly on restock.

## 7) Product flow
1. Shopper lands on product page and selects out-of-stock size.
2. Widget shows "Notify Me on WhatsApp/Email" CTA.
3. Shopper submits contact details.
4. Event data is sent to tracking pipeline.
5. Weekly scoring model calculates missed revenue and restock units.
6. Founder receives WhatsApp report every Monday.
7. On restock, founder triggers customer alert blast.

## 8) MVP feature set

### F1 — Out-of-stock widget
- Variant-aware CTA on unavailable sizes
- Phone/email capture with consent text
- Brandable UI

### F2 — Event instrumentation
Track these events per `shop_id + product_id + variant_id`:
- `oos_view`
- `size_selected_oos`
- `notify_submitted`
- `repeat_variant_check`

### F3 — Weekly intelligence report
- Top N missed-sales variants
- Estimated missed revenue per variant
- Recommended restock units
- One-line actions for founder

### F4 — Restock recovery broadcast
- Send WhatsApp messages to waitlisted users on restock
- UTM-tagged links for conversion attribution

## 9) Success metrics

### Activation metrics
- Install to first event (< 10 minutes)
- % stores with at least 1 notify lead in week 1

### Value metrics
- Missed revenue identified per store/week
- % recommended variants restocked
- Restock alert conversion rate

### Commercial metrics
- Free-to-paid conversion
- 30-day retention
- Churn reason distribution

## 10) Risks and mitigations
- **WhatsApp approval delays:** start with email fallback and pre-approved templates.
- **Tracking gaps on custom themes:** include no-code pixel fallback and QA checklist.
- **Low data volume on small stores:** use confidence flags and minimum-signal thresholds.

