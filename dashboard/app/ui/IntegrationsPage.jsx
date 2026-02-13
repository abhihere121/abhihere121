"use client";

import { MDCard, MDButton, mdTheme, MDChip } from "../material";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useShop } from "../context/ShopContext";

export function IntegrationsPage() {
    const { shop, setShop } = useShop();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
    const searchParams = useSearchParams();
    const shopFromUrl = searchParams.get("shop") || "";

    useEffect(() => {
        if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
    }, [shopFromUrl, shop, setShop]);

    const loadSettings = async () => {
        if (!shop) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/api/integrations/settings?shop=${encodeURIComponent(shop)}`);
            const data = await res.json();
            if (data.ok) {
                setSettings(data.settings);
            }
        } catch (e) {
            console.error("Failed to load integration settings", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [shop]);

    const saveSettings = async (newSettings) => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`${apiBase}/api/integrations/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shop, ...newSettings })
            });
            const data = await res.json();
            if (data.ok) {
                setSettings(data.settings);
                setMsg({ type: "success", text: "Settings saved!" });
            } else {
                setMsg({ type: "error", text: data.error || "Failed to save" });
            }
        } catch (e) {
            setMsg({ type: "error", text: "Network error" });
        } finally {
            setSaving(false);
        }
    };

    const containerStyle = {
        padding: "32px",
        width: "100%",
        boxSizing: "border-box",
        margin: "0 auto",
        maxWidth: "1200px",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
    };

    const inputStyle = {
        width: "100%",
        padding: "10px",
        border: `1px solid ${mdTheme.colors.outline}`,
        borderRadius: "8px",
        fontSize: "14px",
        marginTop: "4px"
    };

    const labelStyle = {
        fontSize: "12px",
        fontWeight: "600",
        color: mdTheme.colors.onSurfaceVariant,
        marginTop: "12px",
        display: "block"
    };

    if (loading) return <div style={{ padding: 40 }}>Loading integration settings...</div>;

    return (
        <div style={containerStyle}>
            <div>
                <h1 style={{ ...mdTheme.typography.headlineMedium, color: mdTheme.colors.onSurface, marginBottom: "8px" }}>
                    Growth Integrations
                </h1>
                <p style={{ ...mdTheme.typography.bodyLarge, color: mdTheme.colors.onSurfaceVariant }}>
                    Connect RESTIQ to your favorite marketing tools to recover more revenue.
                </p>
                {msg && (
                    <div style={{
                        marginTop: 16,
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: msg.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                        color: msg.type === 'success' ? '#03543F' : '#9B1C1C',
                        fontSize: 14,
                        fontWeight: 500
                    }}>
                        {msg.text}
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

                {/* WhatsApp Integration */}
                <MDCard padding="lg">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 24 }}>📱</span>
                            <h3 style={{ ...mdTheme.typography.titleMedium, margin: 0 }}>WhatsApp Business</h3>
                        </div>
                        <MDChip
                            label={settings?.whatsapp_enabled ? "CONNECTED" : "DISCONNECTED"}
                            variant={settings?.whatsapp_enabled ? "success" : "assist"}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                            <input
                                type="checkbox"
                                checked={settings?.whatsapp_enabled || false}
                                onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                            />
                            <span>Enable WhatsApp Alerts</span>
                        </label>

                        <div>
                            <label style={labelStyle}>Provider</label>
                            <select
                                value={settings?.whatsapp_provider || 'twilio'}
                                onChange={(e) => setSettings({ ...settings, whatsapp_provider: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="twilio">Twilio (Recommended)</option>
                                <option value="official">WhatsApp Business API (Official)</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Account SID / ID</label>
                            <input
                                type="text"
                                value={settings?.whatsapp_sid || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_sid: e.target.value })}
                                style={inputStyle}
                                placeholder="AC..."
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Auth Token / Key</label>
                            <input
                                type="password"
                                value={settings?.whatsapp_token || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_token: e.target.value })}
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>From Number / ID</label>
                            <input
                                type="text"
                                value={settings?.whatsapp_from || ''}
                                onChange={(e) => setSettings({ ...settings, whatsapp_from: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. +14150000000"
                            />
                        </div>

                        <MDButton
                            style={{ marginTop: 16 }}
                            onClick={() => saveSettings(settings)}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save WhatsApp Settings"}
                        </MDButton>
                    </div>
                </MDCard>

                {/* Klaviyo Integration */}
                <MDCard padding="lg">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 24 }}>✉️</span>
                            <h3 style={{ ...mdTheme.typography.titleMedium, margin: 0 }}>Klaviyo</h3>
                        </div>
                        <MDChip
                            label={settings?.klaviyo_enabled ? "CONNECTED" : "DISCONNECTED"}
                            variant={settings?.klaviyo_enabled ? "success" : "assist"}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                            <input
                                type="checkbox"
                                checked={settings?.klaviyo_enabled || false}
                                onChange={(e) => setSettings({ ...settings, klaviyo_enabled: e.target.checked })}
                            />
                            <span>Sync Waitlists to Klaviyo</span>
                        </label>

                        <div>
                            <label style={labelStyle}>Klaviyo Private API Key</label>
                            <input
                                type="password"
                                value={settings?.klaviyo_api_key || ''}
                                onChange={(e) => setSettings({ ...settings, klaviyo_api_key: e.target.value })}
                                style={inputStyle}
                                placeholder="pk_..."
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Default List ID</label>
                            <input
                                type="text"
                                value={settings?.klaviyo_list_id || ''}
                                onChange={(e) => setSettings({ ...settings, klaviyo_list_id: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. ABC123"
                            />
                        </div>

                        <div style={{ flex: 1 }} />

                        <MDButton
                            style={{ marginTop: 'auto' }}
                            onClick={() => saveSettings(settings)}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Klaviyo Settings"}
                        </MDButton>
                    </div>
                </MDCard>

                {/* SMTP Integration */}
                <MDCard padding="lg" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 24 }}>💻</span>
                            <h3 style={{ ...mdTheme.typography.titleMedium, margin: 0 }}>Custom Email (SMTP)</h3>
                        </div>
                        <MDChip
                            label={settings?.smtp_enabled ? "CONNECTED" : "DISCONNECTED"}
                            variant={settings?.smtp_enabled ? "success" : "assist"}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={settings?.smtp_enabled || false}
                                    onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked })}
                                />
                                <span>Enable Custom SMTP Sending</span>
                            </label>

                            <div>
                                <label style={labelStyle}>SMTP Host</label>
                                <input
                                    type="text"
                                    value={settings?.smtp_host || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                                    style={inputStyle}
                                    placeholder="smtp.gmail.com"
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>SMTP Port</label>
                                <input
                                    type="number"
                                    value={settings?.smtp_port || 587}
                                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Username</label>
                                <input
                                    type="text"
                                    value={settings?.smtp_user || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Password</label>
                                <input
                                    type="password"
                                    value={settings?.smtp_pass || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>From Email</label>
                                <input
                                    type="text"
                                    value={settings?.smtp_from || ''}
                                    onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                                    style={inputStyle}
                                    placeholder="alerts@yourdomain.com"
                                />
                            </div>

                            <MDButton
                                style={{ marginTop: 16 }}
                                onClick={() => saveSettings(settings)}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save SMTP Settings"}
                            </MDButton>
                        </div>
                    </div>
                </MDCard>
            </div>
        </div>
    );
}
