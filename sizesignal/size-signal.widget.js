(() => {
  // CONFIGURATION
  // For local demo, point to our node server. For production, use your Make.com webhook URL.
  const WEBHOOK_URL = 'http://localhost:3001/webhook'; 
  // const WEBHOOK_URL = 'https://hook.us1.make.com/your-webhook-id'; // Production URL
  function findVariantById(id) {
    const p = window.SizeSignalProduct;
    if (!p || !p.variants) return null;
    id = Number(id);
    return p.variants.find(v => Number(v.id) === id) || null;
  }
  function getCurrentVariantId() {
    const select = document.querySelector('select[name="id"]');
    if (select && select.value) return select.value;
    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden && hidden.value) return hidden.value;
    return String(window.SizeSignalProduct?.variants?.[0]?.id || "");
  }
  function showHideWidget() {
    const variantId = getCurrentVariantId();
    const v = findVariantById(variantId);
    const widget = document.getElementById("size-signal-widget");
    const sizeInput = document.getElementById("ss-size-option");
    const variantInput = document.getElementById("ss-variant-id");
    if (!widget || !v) return;
    if (variantInput) variantInput.value = String(v.id);
    if (sizeInput) sizeInput.value = v.option1 || v.title || "";
    widget.style.display = v.available ? "none" : "block";
  }
  function onVariantChange() {
    showHideWidget();
  }
  function phoneValid(phone) {
    const cleaned = String(phone).replace(/\s+/g, "");
    return /^\+?\d{10,15}$/.test(cleaned);
  }
  async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    const statusEl = document.getElementById("ss-status");
    const whatsapp = form.querySelector("#ss-whatsapp")?.value || "";
    const email = form.querySelector("#ss-email")?.value || "";
    const consent = form.querySelector("#ss-consent")?.checked || false;
    const product_id = form.querySelector('input[name="product_id"]')?.value || "";
    const product_handle = form.querySelector('input[name="product_handle"]')?.value || "";
    const variant_id = form.querySelector("#ss-variant-id")?.value || "";
    const size_option = form.querySelector("#ss-size-option")?.value || "";
    if (!consent) {
      if (statusEl) statusEl.textContent = "Please accept WhatsApp/email updates.";
      return;
    }
    if (!phoneValid(whatsapp)) {
      if (statusEl) statusEl.textContent = "Enter a valid WhatsApp number.";
      return;
    }
    const payload = {
      event: "notify_intent",
      timestamp: new Date().toISOString(),
      page_url: location.href,
      product_id,
      product_handle,
      variant_id,
      size_option,
      whatsapp,
      email,
      aov: window.SizeSignalProduct?.aov || 0,
      user_agent: navigator.userAgent
    };
    try {
      if (statusEl) statusEl.textContent = "Submitting…";
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (res.ok) {
        if (statusEl) statusEl.textContent = "Done! We’ll WhatsApp you when it’s back.";
        form.reset();
      } else {
        if (statusEl) statusEl.textContent = "Failed. Try again in a minute.";
      }
    } catch {
      if (statusEl) statusEl.textContent = "Network error. Please try again.";
    }
  }
  function wire() {
    const form = document.getElementById("ss-notify-form");
    if (form) form.addEventListener("submit", submitForm);
    const select = document.querySelector('select[name="id"]');
    if (select) select.addEventListener("change", onVariantChange);
    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden) hidden.addEventListener("change", onVariantChange);
    showHideWidget();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
