# SizeSignal - 2 Minute Install Checklist

Send this to founders who say "Yes" to the beta.

---

## 📋 Prerequisites
1.  **Shopify Admin Access**
2.  **Google Account** (for Sheets)
3.  **WhatsApp Business API** (Interakt or Wati trial account)

## 🚀 Step 1: The Widget (Shopify)
1.  Go to **Online Store > Themes > Edit Code**.
2.  Open `Assets` folder -> **Add new asset** -> Upload `size-signal.widget.js` and `size-signal.tracking.js`.
3.  Open `Snippets` folder -> **Add new snippet** -> Name it `notify-me-widget`.
4.  Paste the provided Liquid code (`notify_me.liquid`).
5.  Open your Product template (e.g., `main-product.liquid`).
6.  Add `{% render 'notify-me-widget', product: product %}` where you want the button.
7.  **Save**.

## 📊 Step 2: The Database (Google Sheets)
1.  Make a copy of our **[RESTIQ Template Sheet]** (You will provide your link here).
2.  Share the sheet with `automation@make.com` (or your service account email).

## 🤖 Step 3: The Brain (Make.com)
1.  Import the `make_scenario.json` blueprint into Make.com.
2.  **Webhook Module**: Click "Add", copy the URL.
3.  **Google Sheets Modules**: Connect your Google account and select the Sheet you created in Step 2.
4.  **WhatsApp Module**: Connect your Interakt/Wati API key.
5.  **Save** and switch **ON**.

## 🔗 Step 4: Connect
1.  Go back to Shopify `Assets` -> `size-signal.widget.js`.
2.  Paste your **Make Webhook URL** at the top (line 3).
3.  **Save**.

## ✅ Test It
1.  Go to your store.
2.  Find an Out-of-Stock item.
3.  Click "Notify Me" and enter your number.
4.  Check your Google Sheet -> "Events" tab.
5.  **You're Live!** Wait for Monday morning's report.
