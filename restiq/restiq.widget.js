(() => {
  // CONFIGURATION
  const WEBHOOK_URL = '/api/demand-event';

  function findVariantById(id) {
    const p = window.RESTIQProduct;
    if (!p || !p.variants) return null;
    id = Number(id);
    return p.variants.find(v => Number(v.id) === id) || null;
  }

  function getCurrentVariantId() {
    // Attempt to find selected variant from Shopify standard selectors or our demo selector
    const select = document.querySelector('select[name="id"]');
    if (select && select.value) return select.value;

    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden && hidden.value) return hidden.value;

    // Support for custom chips in demo
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
    const consent = document.getElementById("ss-consent")?.checked || document.getElementById("consent")?.checked || false;

    const variantId = getCurrentVariantId();
    const v = findVariantById(variantId);

    if (!consent) {
      alert("Please accept WhatsApp/email updates.");
      return;
    }

    if (!phoneValid(whatsapp)) {
      alert("Please enter a valid WhatsApp number.");
      return;
    }

    const payload = {
      event: "notify_intent",
      timestamp: new Date().toISOString(),
      shop: window.Shopify?.shop || window.RESTIQProduct?.shop || "demo-store.myshopify.com",
      page_url: location.href,
      product_id: window.RESTIQProduct?.id,
      product_handle: window.RESTIQProduct?.handle,
      variant_id: variantId,
      size_option: v?.option1 || v?.title || "",
      price_paise: (window.RESTIQProduct?.aov || 0) * 100, // Assuming aov is in currency units
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
        if (formContent) formContent.style.display = "none";
        if (successState) successState.style.display = "block";
        if (displayPhone) displayPhone.textContent = whatsapp;
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
    // Buttons & Modals
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

    // Variant Listeners
    const select = document.querySelector('select[name="id"]');
    if (select) select.addEventListener("change", toggleWidgetUI);

    const hidden = document.querySelector('input[name="id"][type="hidden"]');
    if (hidden) {
      // Shopify doesn't trigger 'change' on hidden inputs, so we might need a MutationObserver 
      // or just rely on the click events of the theme's variant selectors.
      const observer = new MutationObserver(toggleWidgetUI);
      observer.observe(hidden, { attributes: true });
    }

    // Support for demo chips
    document.querySelectorAll('.size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        setTimeout(toggleWidgetUI, 50); // Small delay to let demo script finish
      });
    });

    toggleWidgetUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
