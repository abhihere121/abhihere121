(() => {
  // CONFIGURATION
  // For local demo, point to our node server. For production, use your Make.com webhook URL.
  const WEBHOOK_URL = 'http://localhost:3001/webhook';
  // const WEBHOOK_URL = 'https://hook.us1.make.com/your-webhook-id'; // Production URL
  let sessionStart = Date.now();
  let lastVariantId = null;
  function findVariantById(id) {
    const p = window.RESTIQProduct;
    if (!p || !p.variants) return null;
    id = Number(id);
    return p.variants.find(v => Number(v.id) === id) || null;
  }
  function getCurrentVariantId() {
    const select = document.querySelector('select[name="id"]');
    if (select && select.value) return select.value;
    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden && hidden.value) return hidden.value;
    return String(window.RESTIQProduct?.variants?.[0]?.id || "");
  }
  function send(payload) {
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(WEBHOOK_URL, blob);
        if (ok) return;
      }
    } catch { }
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => { });
  }
  function markRepeat(variantId) {
    try {
      const key = "restiq_seen_variants";
      const map = JSON.parse(localStorage.getItem(key) || "{}");
      map[String(variantId)] = (map[String(variantId)] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(map));
      return map[String(variantId)];
    } catch {
      return 1;
    }
  }
  function emitVisit() {
    const variantId = getCurrentVariantId();
    lastVariantId = variantId;
    const v = findVariantById(variantId);
    const repeat_count = markRepeat(variantId);
    const payload = {
      event: "variant_view",
      timestamp: new Date().toISOString(),
      page_url: location.href,
      product_id: window.RESTIQProduct?.id || "",
      product_handle: window.RESTIQProduct?.handle || "",
      variant_id: variantId,
      size_option: v?.option1 || v?.title || "",
      available: Boolean(v?.available),
      repeat_count,
      aov: window.RESTIQProduct?.aov || 0,
      user_agent: navigator.userAgent
    };
    send(payload);
    if (v && !v.available) {
      send({
        event: "oos_visit",
        timestamp: new Date().toISOString(),
        page_url: location.href,
        product_id: window.RESTIQProduct?.id || "",
        product_handle: window.RESTIQProduct?.handle || "",
        variant_id: variantId,
        size_option: v?.option1 || v?.title || "",
        aov: window.RESTIQProduct?.aov || 0,
        user_agent: navigator.userAgent
      });
    }
  }
  function onVariantChange() {
    emitVisit();
  }
  function onBeforeUnload() {
    const dwell = Date.now() - sessionStart;
    const v = findVariantById(lastVariantId || getCurrentVariantId());
    send({
      event: "bounce",
      timestamp: new Date().toISOString(),
      page_url: location.href,
      product_id: window.RESTIQProduct?.id || "",
      product_handle: window.RESTIQProduct?.handle || "",
      variant_id: lastVariantId || getCurrentVariantId(),
      size_option: v?.option1 || v?.title || "",
      available: Boolean(v?.available),
      dwell_ms: dwell,
      aov: window.RESTIQProduct?.aov || 0,
      user_agent: navigator.userAgent
    });
  }
  function wire() {
    emitVisit();
    const select = document.querySelector('select[name="id"]');
    if (select) select.addEventListener("change", onVariantChange);
    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden) hidden.addEventListener("change", onVariantChange);
    window.addEventListener("beforeunload", onBeforeUnload);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
