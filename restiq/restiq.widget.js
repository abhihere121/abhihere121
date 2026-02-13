(() => {
  // CONFIGURATION
  const WEBHOOK_URL = '/api/demand-event';

  function findVariantById(id) {
    const p = window.RESTIQProduct;
    if (!p || !p.variants) return null;
    id = Number(id);
    return p.variants.find(v => Number(v.id) === id) || null;
  }

  const lastReported = {};

  async function reportEvent(eventName) {
    const variantId = getCurrentVariantId();
    const v = findVariantById(variantId);

    // Deduplicate: same variant/event within 1.5 seconds
    const key = `${variantId}:${eventName}`;
    const now = Date.now();
    if (lastReported[key] && (now - lastReported[key] < 1500)) {
      return;
    }
    lastReported[key] = now;

    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      shop: window.Shopify?.shop || window.RESTIQProduct?.shop || "demo-store.myshopify.com",
      page_url: location.href,
      product_id: window.RESTIQProduct?.id,
      product_handle: window.RESTIQProduct?.handle,
      variant_id: variantId,
      size_option: v?.option1 || v?.title || "",
      price_paise: (window.RESTIQProduct?.aov || 0) * 100,
      event_id: 'ss_' + Math.random().toString(36).substr(2, 9),
      user_agent: navigator.userAgent
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {
      console.warn("RESTIQ: Event reporting failed", e);
    }
  }

  function getCurrentVariantId() {
    const select = document.querySelector('select[name="id"]');
    if (select && select.value) return select.value;

    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden && hidden.value) return hidden.value;

    const selectedChip = document.querySelector('.size-chip.selected');
    if (selectedChip) return selectedChip.dataset.variant;

    return String(window.RESTIQProduct?.variants?.[0]?.id || "");
  }

  function toggleWidgetUI() {
    const variantId = getCurrentVariantId();
    const v = findVariantById(variantId);

    const stickyBar = document.getElementById("sticky-bar");
    const stickySize = document.getElementById("sticky-size");
    const modalSize = document.getElementById("modal-size");
    const atcBtn = document.getElementById("atc-btn");

    if (!v) return;

    if (v.available) {
      if (stickyBar) stickyBar.classList.remove("visible");
      if (atcBtn) {
        atcBtn.disabled = false;
        atcBtn.textContent = "Add to Cart";
      }
    } else {
      if (stickySize) stickySize.textContent = v.option1 || v.title || v.size || "selected size";
      if (modalSize) modalSize.textContent = v.option1 || v.title || v.size || "selected size";
      if (stickyBar) stickyBar.classList.add("visible");
      if (atcBtn) {
        atcBtn.disabled = true;
        atcBtn.textContent = "Out of Stock";
      }
      reportEvent("oos_visit");
    }
  }

  function phoneValid(phone) {
    const cleaned = String(phone).replace(/\s+/g, "");
    return /^\+?\d{10,15}$/.test(cleaned);
  }

  async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById("submit-btn");
    const formContent = document.getElementById("modal-form-content");
    const successState = document.getElementById("success-state");
    const displayPhone = document.getElementById("display-phone");

    const whatsapp = document.getElementById("ss-whatsapp")?.value || document.getElementById("whatsapp")?.value || "";
    const email = document.getElementById("ss-email")?.value || document.getElementById("email")?.value || "";

    const variantId = getCurrentVariantId();
    const v = findVariantById(variantId);

    const payload = {
      event: "notify_intent",
      timestamp: new Date().toISOString(),
      shop: window.Shopify?.shop || window.RESTIQProduct?.shop || "demo-store.myshopify.com",
      page_url: location.href,
      product_id: window.RESTIQProduct?.id,
      product_handle: window.RESTIQProduct?.handle,
      variant_id: variantId,
      size_option: v?.option1 || v?.title || "",
      price_paise: (window.RESTIQProduct?.aov || 0) * 100,
      whatsapp,
      email,
      event_id: 'ss_' + Math.random().toString(36).substr(2, 9),
      user_agent: navigator.userAgent
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
      }

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (res.ok) {
        // Apply custom success text if available
        const h = document.getElementById("ss-success-heading");
        const t = document.getElementById("ss-success-text");
        if (h && window.RESTIQSettings?.success_heading) h.textContent = window.RESTIQSettings.success_heading;
        if (t && window.RESTIQSettings?.success_text) t.textContent = window.RESTIQSettings.success_text;

        if (formContent) formContent.style.display = "none";
        if (successState) successState.style.display = "block";
        if (displayPhone) displayPhone.textContent = whatsapp || email;
        form.reset();
      } else {
        alert("Failed to submit. Please try again.");
      }
    } catch (err) {
      console.error("RESTIQ Error:", err);
      alert("Network error. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Notify Me";
      }
    }
  }

  function wire() {
    const openBtn = document.getElementById("open-waitlist");
    const closeBtn = document.getElementById("close-modal");
    const overlay = document.getElementById("modal-overlay");
    const closeSuccess = document.getElementById("close-success");
    const form = document.getElementById("waitlist-form") || document.getElementById("ss-notify-form");

    if (openBtn && overlay) {
      openBtn.addEventListener("click", () => overlay.classList.add("active"));
    }

    if (closeBtn && overlay) {
      closeBtn.addEventListener("click", () => overlay.classList.remove("active"));
    }

    if (closeSuccess && overlay) {
      closeSuccess.addEventListener("click", () => {
        overlay.classList.remove("active");
        setTimeout(() => {
          const formContent = document.getElementById("modal-form-content");
          const successState = document.getElementById("success-state");
          if (formContent) formContent.style.display = "block";
          if (successState) successState.style.display = "none";
        }, 300);
      });
    }

    if (form) form.addEventListener("submit", submitForm);

    const select = document.querySelector('select[name="id"]');
    if (select) select.addEventListener("change", toggleWidgetUI);

    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden) {
      const observer = new MutationObserver(toggleWidgetUI);
      observer.observe(hidden, { attributes: true });
    }

    document.querySelectorAll('.size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        setTimeout(toggleWidgetUI, 50);
      });
    });

    toggleWidgetUI();
    reportEvent("variant_view");

    // Apply dynamic styles from window.RESTIQSettings if injected
    if (window.RESTIQSettings) {
      const s = window.RESTIQSettings;
      const root = document.documentElement;
      if (s.primary_color) root.style.setProperty('--ss-primary-color', s.primary_color);
      if (s.border_radius) root.style.setProperty('--ss-border-radius', s.border_radius + 'px');
      if (s.font_size) root.style.setProperty('--ss-font-size', s.font_size + 'px');

      // Hide fields if configured
      const wWrap = document.getElementById("ss-whatsapp-wrapper");
      const eWrap = document.getElementById("ss-email-wrapper");
      if (wWrap && s.show_whatsapp === false) wWrap.style.display = 'none';
      if (eWrap && s.show_email === false) eWrap.style.display = 'none';

      // Update button text
      const btns = document.querySelectorAll('.ss-button-text');
      btns.forEach(b => { if (s.button_text) b.textContent = s.button_text; });
    }
  }

  window.SS_TOGGLE = toggleWidgetUI;
  window.SS_WIRE = wire;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
