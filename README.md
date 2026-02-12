# SizeSignal MVP - Runnable Demo

This is the runnable MVP for **SizeSignal** with a local end-to-end flow: capture out-of-stock demand, store it locally, generate a weekly founder report, and simulate WhatsApp sends.

## 🚀 Quick Start (Local Demo)

You can run a local version of the widget right now.

1.  **Install Dependencies** (Requires Node.js)
    ```bash
    npm install
    ```

2.  **Start the Mock Server**
    ```bash
    node server.js
    ```

3.  **Open the Demo**
    Open your browser to [http://localhost:3001](http://localhost:3001)

4.  **Test It**
    - Select **Size M** (Out of Stock).
    - See the "Notify Me" widget appear.
    - Enter a phone number and click "Notify Me".
    - Open [http://localhost:3001/admin](http://localhost:3001/admin) to preview the weekly WhatsApp report and see captured events/messages.

5.  **Run the End-to-End Check**
    ```bash
    node scripts/e2e.js
    ```

## 🧱 Local Enterprise Mode (Supabase Postgres)
This mode enables the production-style pipeline (OAuth token storage, webhook queue + retries, inventory-based restock detection, and DB persistence).

### Step 1: Create a Supabase Project + Database URL
1. Create a Supabase project.
2. In Supabase, copy the Postgres connection string (use the one meant for Node.js).
3. Ensure the URL includes `?sslmode=require`.

### Step 2: Configure Environment
1. Copy `.env.example` into your own `.env` (do not commit it).
2. Fill at least:
   - `DATABASE_URL` (Supabase Postgres URL)
   - `APP_URL=http://localhost:3001`
   - `NEXT_PUBLIC_API_BASE=http://localhost:3001` (for the dashboard UI)
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`
   - Optional but recommended: `APP_ENCRYPTION_KEY` and `EMBED_SIG_SECRET`

### Step 3: Run Migrations + Start
```bash
npm install
npm run migrate
npm start
```

### Step 4: Local Checks
```bash
npm run smoke
npm run e2e:enterprise
```

## 🖥️ Local Dashboard (Next.js + Polaris)
This runs a Polaris-based dashboard UI that reads from the backend APIs.

1. Start the backend (port 3001):
```bash
npm start
```

2. Open:
- Dashboard: http://localhost:3001/app

## 🛍️ Connect to Shopify (Partner App + CLI Link)
This app uses OAuth (`/auth` → `/auth/callback`) and registers ScriptTag + webhooks on install. For Shopify to reach your local machine, you need a public HTTPS URL (tunnel).

### Recommended scopes
Keep scopes minimal to reduce risk and avoid Shopify review friction:
- `read_products`
- `read_inventory`
- `write_script_tags`
- `write_webhooks`

### Step 1: Start a tunnel
Use any tunnel you like (Cloudflare Tunnel / ngrok). You need a stable HTTPS URL like:
`https://YOUR_TUNNEL_URL`

Set:
- `APP_URL=https://YOUR_TUNNEL_URL`

Also update [shopify.app.toml](file:///c:/Users/aviku/Documents/trae_projects/signal/shopify.app.toml) to replace `https://YOUR_TUNNEL_URL` with your tunnel URL.

### Step 2: Configure the Partner app
In Shopify Partners → your app → Configuration:
- App URL: `https://YOUR_TUNNEL_URL`
- Allowed redirection URL: `https://YOUR_TUNNEL_URL/auth/callback`

Copy the app credentials into `.env`:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`

### Step 3: Link config via Shopify CLI
From the repo root:
```bash
shopify login
shopify app config link
```
When prompted, select the Partner app and pick `shopify.app.toml`.

### Step 4: Install on a dev store
With the backend running:
```text
https://YOUR_TUNNEL_URL/auth?shop=YOUR_DEV_STORE.myshopify.com
```
After install, the app will:
- Store the token in Postgres (Supabase)
- Register webhooks: `products/update`, `inventory_levels/update`
- Create a ScriptTag pointing to: `/embed/sizesignal.js?shop=...`

## 📂 Project Structure

- `demo.html`: Simulates a Shopify product page with the widget embedded.
- `server.js`: Local backend that ingests webhooks, stores data, generates reports, and simulates WhatsApp sends.
- `data/`: Local persisted data (JSONL).
    - `events.jsonl`: All captured events.
    - `waitlist.jsonl`: Opt-in list from notify intents.
    - `messages.jsonl`: Simulated WhatsApp sends (founder + customers).
- `sizesignal/`: Contains the core source files for production.
    - `notify_me.liquid`: The Shopify Liquid snippet for the widget.
    - `size-signal.widget.js`: Handles widget interaction and form submission.
    - `size-signal.tracking.js`: Background tracking for visits and bounces.
    - `messageProvider.js`: Message provider abstraction (local provider).
    - `make_scenario.json`: Blueprint to import into Make.com.
    - `*.csv`: Templates for Google Sheets database.
- `scripts/e2e.js`: Automated local end-to-end verification.

## Local Endpoints
- Demo: `GET /`
- Admin: `GET /admin`
- Webhook ingest: `POST /webhook`
- Hosted embed script: `GET /embed/sizesignal.js?shop=storename.myshopify.com`
- Demand API (production path): `POST /api/demand-event`
- Weekly report JSON: `GET /report/weekly?brand_name=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- Send weekly report (local WhatsApp): `POST /report/send-weekly` (form-url-encoded)
- Send restock alerts (local WhatsApp): `POST /admin/send-restock-alerts` (form-url-encoded)

## 🚢 Deployment Guide (Go Live)

When you are ready to install this on a real store:

### Step 1: Backend Setup (Make.com + Google Sheets)
1.  Create a Google Sheet with 4 tabs: `Events`, `WeeklySummary`, `Restock`, `Waitlist`.
    - Import the CSV headers from `sizesignal/` into each tab.
2.  Create a new Scenario in Make.com.
3.  Add a **Webhooks** module ("Custom Webhook").
4.  Copy the **Webhook URL**.
5.  Import `sizesignal/make_scenario.json` to build the rest of the flow (optional, or build manually: Webhook -> Google Sheets "Add Row").

### Step 2: Configure Scripts
1.  Open `sizesignal/size-signal.widget.js` and `sizesignal/size-signal.tracking.js`.
2.  Replace the `WEBHOOK_URL` constant:
    ```javascript
    // Change this:
    const WEBHOOK_URL = 'http://localhost:3001/webhook';
    // To this:
    const WEBHOOK_URL = 'https://hook.us1.make.com/your-unique-id';
    ```

### Step 3: Shopify Install
1.  Go to **Online Store > Themes > Edit Code**.
2.  Upload `size-signal.widget.js` and `size-signal.tracking.js` to the **Assets** folder.
3.  Create a new Snippet named `notify-me-widget`.
4.  Paste the code from `sizesignal/notify_me.liquid`.
5.  Include the snippet in your Product template (usually `main-product.liquid` or `product-form.liquid`) where you want the button to appear:
    ```liquid
    {% render 'notify-me-widget', product: product %}
    ```
6.  Add the script tags to `theme.liquid` before `</body>`:
    ```html
    <script src="{{ 'size-signal.tracking.js' | asset_url }}" defer></script>
    <script src="{{ 'size-signal.widget.js' | asset_url }}" defer></script>
    ```

## ✅ Verification
- Visit a product page on your live store.
- Select an out-of-stock variant.
- Submit the form.
- Verify the row appears in your Google Sheet!
