"use client";

import { MDCard, MDButton, mdTheme } from "../material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShop } from "../context/ShopContext";
import { WidgetPreview } from "./WidgetPreview";

export function WidgetPage() {
  const { shop, setShop } = useShop();
  const [snippet, setSnippet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState(null);

  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  const load = async () => {
    try {
      const s = await fetch(`${apiBase}/api/widget/snippet?shop=${encodeURIComponent(shop)}`, { cache: "no-store" }).then((r) =>
        r.json().catch(() => null)
      );
      setSnippet(s);
    } catch {
      setSnippet({ ok: false, error: "Failed to load snippet" });
    }
    try {
      const r = await fetch(`${apiBase}/api/widget/settings?shop=${encodeURIComponent(shop)}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      setSettings(j?.ok ? j.settings : null);
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    if (!shop) return;
    load();
  }, [shop]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/widget/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          ...settings
        })
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) {
        setSettings(json.settings);
        setMsg({ type: "success", text: "Settings saved!" });
      } else {
        setMsg({ type: "error", text: json?.error || "Failed to save" });
      }
    } catch (e) {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await fetch(`${apiBase}/api/dev/seed?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop })
      }).then((r) => r.json().catch(() => null));
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${mdTheme.colors.outline}`,
    borderRadius: mdTheme.shape.small,
    fontSize: mdTheme.typography.bodyLarge.fontSize,
    backgroundColor: 'white',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: mdTheme.spacing.xs,
    fontWeight: 500,
    fontSize: mdTheme.typography.labelLarge.fontSize,
    color: mdTheme.colors.onSurface
  };

  return (
    <div style={{ padding: mdTheme.spacing.xl, width: '100%', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: mdTheme.spacing.xl }}>
        <h1 style={{ fontSize: mdTheme.typography.headlineLarge.fontSize, fontWeight: 400, color: mdTheme.colors.onSurface, margin: 0, marginBottom: mdTheme.spacing.xs }}>
          Widget Management
        </h1>
        <p style={{ fontSize: mdTheme.typography.bodyLarge.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0 }}>
          Configure your storefront widget and installation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: mdTheme.spacing.xl, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.xl }}>
          {/* Connection & Mode */}
          <MDCard elevation={1} padding="lg">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: mdTheme.spacing.md, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Shop Domain</label>
                <input
                  type="text"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <MDButton onClick={load}>Refresh</MDButton>
            </div>
          </MDCard>

          {!settings ? (
            <MDCard elevation={1} padding="lg">
              <div style={{ padding: mdTheme.spacing.lg, textAlign: 'center', color: mdTheme.colors.onSurfaceVariant }}>
                Install the app for this shop to manage settings.
              </div>
            </MDCard>
          ) : (
            <>
              {/* Appearance Settings */}
              <MDCard elevation={1} padding="lg">
                <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.lg }}>Widget Appearance</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.lg }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: mdTheme.spacing.md, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.enabled)}
                      onChange={(e) => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                      style={{ width: 20, height: 20 }}
                    />
                    <span style={{ fontWeight: 500 }}>Enable widget UI on storefront</span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mdTheme.spacing.md }}>
                    <div>
                      <label style={labelStyle}>Placement</label>
                      <select
                        value={settings.placement}
                        onChange={(e) => setSettings(s => ({ ...s, placement: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="floating">Floating (bottom-right)</option>
                        <option value="inline">Inline (inside theme element)</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Primary Color</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={settings.primary_color || "#111827"}
                          onChange={(e) => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                          style={{ width: '48px', height: '48px', padding: '4px', border: `1px solid ${mdTheme.colors.outline}`, borderRadius: '4px', background: 'none' }}
                        />
                        <input
                          type="text"
                          value={settings.primary_color || "#111827"}
                          onChange={(e) => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mdTheme.spacing.md }}>
                    <div>
                      <label style={labelStyle}>Border Radius (px)</label>
                      <input
                        type="number"
                        value={settings.border_radius || 0}
                        onChange={(e) => setSettings(s => ({ ...s, border_radius: parseInt(e.target.value) || 0 }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Font Size (px)</label>
                      <input
                        type="number"
                        value={settings.font_size || 0}
                        onChange={(e) => setSettings(s => ({ ...s, font_size: parseInt(e.target.value) || 0 }))}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Heading Text</label>
                    <input
                      type="text"
                      value={settings.heading_text || ""}
                      onChange={(e) => setSettings(s => ({ ...s, heading_text: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Button Text</label>
                    <input
                      type="text"
                      value={settings.button_text || ""}
                      onChange={(e) => setSettings(s => ({ ...s, button_text: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </MDCard>

              {/* Form & Success Settings */}
              <MDCard elevation={1} padding="lg">
                <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.lg }}>Form & Success Message</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.lg }}>
                  <div style={{ display: 'flex', gap: mdTheme.spacing.xl }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: mdTheme.spacing.md, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.show_whatsapp)}
                        onChange={(e) => setSettings(s => ({ ...s, show_whatsapp: e.target.checked }))}
                        style={{ width: 18, height: 18 }}
                      />
                      <span>Show WhatsApp</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: mdTheme.spacing.md, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.show_email)}
                        onChange={(e) => setSettings(s => ({ ...s, show_email: e.target.checked }))}
                        style={{ width: 18, height: 18 }}
                      />
                      <span>Show Email</span>
                    </label>
                  </div>

                  <div>
                    <label style={labelStyle}>Success Heading</label>
                    <input
                      type="text"
                      value={settings.success_heading || ""}
                      onChange={(e) => setSettings(s => ({ ...s, success_heading: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Success Message</label>
                    <textarea
                      value={settings.success_text || ""}
                      onChange={(e) => setSettings(s => ({ ...s, success_text: e.target.value }))}
                      style={{ ...inputStyle, height: '80px' }}
                    />
                  </div>
                </div>
              </MDCard>

              {/* Advanced Settings */}
              <MDCard elevation={1} padding="lg">
                <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.lg }}>Advanced</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.lg }}>
                  {settings.placement === 'inline' && (
                    <div>
                      <label style={labelStyle}>CSS Selector</label>
                      <input
                        type="text"
                        value={settings.selector || ""}
                        onChange={(e) => setSettings(s => ({ ...s, selector: e.target.value }))}
                        style={inputStyle}
                        placeholder="#ss-embed-inline"
                      />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Custom CSS</label>
                    <textarea
                      value={settings.custom_css || ""}
                      onChange={(e) => setSettings(s => ({ ...s, custom_css: e.target.value }))}
                      style={{ ...inputStyle, height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ marginTop: mdTheme.spacing.md, display: 'flex', gap: mdTheme.spacing.md, alignItems: 'center' }}>
                    <MDButton onClick={save} disabled={saving}>
                      {saving ? "Saving..." : "Save All Settings"}
                    </MDButton>
                    <MDButton variant="outlined" onClick={seed} disabled={seeding}>
                      {seeding ? "Restore Default Data" : "Restore Demo Data"}
                    </MDButton>
                    {msg && (
                      <span style={{ color: msg.type === 'success' ? mdTheme.colors.primary : mdTheme.colors.error, fontSize: '14px' }}>
                        {msg.text}
                      </span>
                    )}
                  </div>
                </div>
              </MDCard>
            </>
          )}

          {/* Theme Snippets */}
          <MDCard elevation={1} padding="lg">
            <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, margin: 0, marginBottom: mdTheme.spacing.md }}>Manual Installation Snippets</h2>

            <div style={{ marginBottom: mdTheme.spacing.lg }}>
              <label style={labelStyle}>1. App Loader (Required Global Script)</label>
              <p style={{ fontSize: '12px', color: mdTheme.colors.onSurfaceVariant, marginBottom: '8px' }}>
                Add this to your theme's <code>&lt;head&gt;</code> tag to load the RESTIQ logic globally.
              </p>
              <div style={{
                background: mdTheme.colors.surfaceVariant,
                padding: mdTheme.spacing.md,
                borderRadius: mdTheme.shape.medium,
                fontFamily: 'monospace',
                fontSize: '11px',
                color: mdTheme.colors.onSurfaceVariant,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: `1px solid ${mdTheme.colors.outlineVariant}`
              }}>
                {snippet?.ok ? snippet.appLoaderSnippet : "— No snippet available —"}
              </div>
              {snippet?.ok && (
                <MDButton variant="outlined" style={{ marginTop: '8px' }} onClick={() => {
                  try {
                    navigator.clipboard.writeText(snippet.appLoaderSnippet);
                    setMsg({ type: "success", text: "App Loader copied!" });
                  } catch { }
                }}>
                  Copy App Loader
                </MDButton>
              )}
            </div>

            <div style={{ marginBottom: mdTheme.spacing.md }}>
              <label style={labelStyle}>2. Inline Snippet (Optional Placement)</label>
              <p style={{ fontSize: '12px', color: mdTheme.colors.onSurfaceVariant, marginBottom: '8px' }}>
                Place this in your product template (e.g., <code>main-product.liquid</code>) where you want the out-of-stock widget to appear.
              </p>
              <div style={{
                background: mdTheme.colors.surfaceVariant,
                padding: mdTheme.spacing.md,
                borderRadius: mdTheme.shape.medium,
                fontFamily: 'monospace',
                fontSize: '11px',
                color: mdTheme.colors.onSurfaceVariant,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: `1px solid ${mdTheme.colors.outlineVariant}`
              }}>
                {snippet?.ok ? snippet.manualInlineSnippet : "— No snippet available —"}
              </div>
              {snippet?.ok && (
                <MDButton variant="outlined" style={{ marginTop: '8px' }} onClick={() => {
                  try {
                    navigator.clipboard.writeText(snippet.manualInlineSnippet);
                    setMsg({ type: "success", text: "Inline Snippet copied!" });
                  } catch { }
                }}>
                  Copy Inline Snippet
                </MDButton>
              )}
            </div>
          </MDCard>
        </div>

        {/* Sidebar Preview */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <WidgetPreview settings={settings} />
          <div style={{ marginTop: mdTheme.spacing.md, padding: mdTheme.spacing.md, borderRadius: mdTheme.shape.medium, background: mdTheme.colors.surfaceVariant }}>
            <p style={{ fontSize: '12px', color: mdTheme.colors.onSurfaceVariant, margin: 0, lineHeight: 1.5 }}>
              <strong>Tip:</strong> Changes you make to the left will be reflected here in real-time. Don't forget to save your changes when you're happy with the design!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
