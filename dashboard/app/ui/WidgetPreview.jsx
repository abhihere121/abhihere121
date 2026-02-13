"use client";

import { mdTheme } from "../material";

export function WidgetPreview({ settings }) {
    const {
        heading_text = "Get restock alerts",
        button_text = "Notify Me",
        primary_color = "#3B82F6" // Sapphire Blue as default CTA
    } = settings || {};

    return (
        <div style={{
            border: `1px solid ${mdTheme.colors.outlineVariant}`,
            borderRadius: mdTheme.shape.medium,
            background: "#fff",
            overflow: "hidden",
            boxShadow: mdTheme.elevation[1]
        }}>
            <div style={{ padding: 12, borderBottom: `1px solid ${mdTheme.colors.outlineVariant}`, background: mdTheme.colors.surfaceVariant, fontSize: 12, fontWeight: 600, color: mdTheme.colors.onSurfaceVariant }}>
                Live Preview (Storefront)
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "#F8FAFC", minHeight: 280, position: "relative" }}>
                {/* Mock Product Card */}
                <div style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                    border: "1px solid #F1F5F9"
                }}>
                    <div style={{ height: 100, background: "linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)", borderRadius: 12, marginBottom: 12 }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>Premium Kurta</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>₹2,499</div>
                    <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                        {[38, 40, 42].map(s => (
                            <div key={s} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500 }}>{s}</div>
                        ))}
                        <div style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #0F172A", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#475569" }}>44</div>
                    </div>
                </div>

                {/* Mock Sticky Bar - Refined for Phase 2.5 */}
                <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "#0F172A",
                    color: "white",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10
                }}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>Size 44 is out of stock.</div>
                    <button style={{
                        background: primary_color,
                        color: "white",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "default"
                    }}>
                        {button_text}
                    </button>
                </div>
            </div>
        </div>
    );
}
