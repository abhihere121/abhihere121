"use client";

import { mdTheme } from "../material";

export function WidgetPreview({ settings }) {
    const {
        heading_text = "Get restock alerts",
        button_text = "Notify Me",
        primary_color = "#3B82F6",
        border_radius = 8,
        font_size = 14,
        show_email = true,
        show_whatsapp = true,
        success_heading = "You're on the list!",
        success_text = "We'll notify you soon."
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
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "#F8FAFC", minHeight: 400, position: "relative" }}>
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
                </div>

                {/* Simulated Widget Modal */}
                <div style={{
                    background: "#fff",
                    borderRadius: `${border_radius}px`,
                    padding: 20,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                    border: "1px solid #E2E8F0",
                    width: "100%",
                    boxSizing: 'border-box'
                }}>
                    <div style={{ fontSize: `${font_size + 2}px`, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
                        {heading_text}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {show_whatsapp && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>WhatsApp Number</label>
                                <div style={{ padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#F9FAFB', color: '#9CA3AF', fontSize: '12px' }}>
                                    +91 99999 99999
                                </div>
                            </div>
                        )}
                        {show_email && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Email Address</label>
                                <div style={{ padding: '8px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#F9FAFB', color: '#9CA3AF', fontSize: '12px' }}>
                                    customer@example.com
                                </div>
                            </div>
                        )}
                        <button style={{
                            background: primary_color,
                            color: "white",
                            border: "none",
                            padding: "10px",
                            borderRadius: `${border_radius}px`,
                            fontSize: `${font_size}px`,
                            fontWeight: 600,
                            marginTop: 4,
                            cursor: "default"
                        }}>
                            {button_text}
                        </button>
                    </div>
                </div>

                {/* Mock Sticky Bar */}
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
                    <div style={{ fontSize: 11, fontWeight: 500 }}>Out of Stock</div>
                    <button style={{
                        background: primary_color,
                        color: "white",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: `${border_radius}px`,
                        fontSize: 10,
                        fontWeight: 600
                    }}>
                        {button_text}
                    </button>
                </div>
            </div>
        </div>
    );
}
