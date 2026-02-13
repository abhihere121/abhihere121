"use client";

import { MDCard, MDButton, mdTheme } from "../material";
import { useEffect, useState } from "react";
import { WidgetPreview } from "./WidgetPreview";
import { useShop } from "../context/ShopContext";

export function SettingsPage() {
  const { shop, setShop } = useShop();
  const [settings, setSettings] = useState({
    enabled: true,
    primary_color: "#111827",
    button_text: "Notify me",
    heading_text: "Get restock alert on WhatsApp",
    consent_text: "I agree to receive restock updates."
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/widget/settings?shop=${encodeURIComponent(shop)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.ok && data.settings) {
          setSettings(s => ({ ...s, ...data.settings }));
        }
      })
      .catch((e) => console.error(e))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [shop]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await fetch("/api/widget/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, ...settings })
      });
      setMsg({ type: "success", text: "Settings saved successfully!" });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: mdTheme.spacing.xl, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: mdTheme.spacing.xl }}>
        <h1 style={{ fontSize: mdTheme.typography.headlineLarge.fontSize, fontWeight: 400, color: mdTheme.colors.onSurface, margin: 0, marginBottom: mdTheme.spacing.xs }}>
          Settings
        </h1>
        <p style={{ fontSize: mdTheme.typography.bodyLarge.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0 }}>
          Configure your store and widget appearance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: mdTheme.spacing.xl }}>
        <div style={{ display: "flex", flexDirection: "column", gap: mdTheme.spacing.lg }}>

          {/* Store Connection */}
          <MDCard elevation={1} padding="lg">
            <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.md }}>Store Connection</h2>
            <div>
              <label style={{ display: 'block', marginBottom: mdTheme.spacing.sm, fontWeight: 500 }}>
                Shop Domain
              </label>
              <input
                type="text"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                style={{
                  width: '100%', padding: '12px',
                  border: `1px solid ${mdTheme.colors.outline}`, borderRadius: mdTheme.shape.small,
                  fontSize: mdTheme.typography.bodyLarge.fontSize
                }}
              />
              <p style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant, marginTop: mdTheme.spacing.sm }}>
                This connects the dashboard to your store's data.
              </p>
            </div>
          </MDCard>

          {/* Widget Configuration */}
          <MDCard elevation={1} padding="lg">
            <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.md }}>Widget Appearance</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: mdTheme.spacing.lg }}>
              <label style={{ display: "flex", alignItems: "center", gap: mdTheme.spacing.md, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                  style={{ width: 20, height: 20 }}
                />
                <span style={{ fontWeight: 500 }}>Enable Widget on Storefront</span>
              </label>

              <div style={{ height: 1, background: mdTheme.colors.outlineVariant }} />

              <label>
                <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Heading Text</span>
                <input
                  type="text"
                  value={settings.heading_text}
                  onChange={e => setSettings(s => ({ ...s, heading_text: e.target.value }))}
                  style={{ width: "100%", padding: 10, border: `1px solid ${mdTheme.colors.outline}`, borderRadius: 4 }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Button Text</span>
                <input
                  type="text"
                  value={settings.button_text}
                  onChange={e => setSettings(s => ({ ...s, button_text: e.target.value }))}
                  style={{ width: "100%", padding: 10, border: `1px solid ${mdTheme.colors.outline}`, borderRadius: 4 }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Primary Color</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                    style={{ height: 42, width: 60, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                    style={{ flex: 1, padding: 10, border: `1px solid ${mdTheme.colors.outline}`, borderRadius: 4 }}
                  />
                </div>
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Consent Text</span>
                <input
                  type="text"
                  value={settings.consent_text}
                  onChange={e => setSettings(s => ({ ...s, consent_text: e.target.value }))}
                  style={{ width: "100%", padding: 10, border: `1px solid ${mdTheme.colors.outline}`, borderRadius: 4 }}
                />
              </label>

              <div style={{ marginTop: mdTheme.spacing.md }}>
                <MDButton onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </MDButton>
                {msg && (
                  <span style={{ marginLeft: mdTheme.spacing.md, color: msg.type === "success" ? mdTheme.colors.success : mdTheme.colors.error }}>
                    {msg.text}
                  </span>
                )}
              </div>
            </div>
          </MDCard>

        </div>

        {/* Live Preview Sidebar */}
        <div style={{ position: "sticky", top: 24 }}>
          <h3 style={{ marginTop: 0, fontSize: mdTheme.typography.titleMedium.fontSize }}>Preview</h3>
          <WidgetPreview settings={settings} />
          <p style={{ marginTop: mdTheme.spacing.md, fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant }}>
            This is how the widget will appear to your customers when a size is out of stock.
          </p>
        </div>
      </div>
    </div>
  );
}
